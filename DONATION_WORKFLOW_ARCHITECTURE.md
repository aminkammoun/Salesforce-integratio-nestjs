# Donation Workflow Cron Job Architecture

## Overview
The **DonationCronService** orchestrates a complete donation repair and synchronization workflow that runs **every 1 minute**. The workflow is designed with a strong, fault-tolerant architecture to handle all steps in the correct order.

## Architecture Pattern: Multi-Phase Pipeline

The cron job follows a **3-Phase Pipeline Pattern** to ensure data consistency and proper dependencies:

```
┌─────────────────────────────────────────────────────────────────────┐
│                    DONATION WORKFLOW (Every 1 min)                  │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┴────────────────┐
                    │                                │
                    ▼                                ▼
        ┌───────────────────┐          ┌────────────────────┐
        │   PHASE 1: REPAIR │          │  Run Prevention    │
        │    DONATIONS      │──────▶   │ (Prevent Concurrent│
        └───────────────────┘          │  Executions)       │
                    │                   └────────────────────┘
                    │
    ┌───────────────┴────────────────────┐
    │ - Repair 'Website' donations       │
    │ - Repair 'Fundraising App' donations│
    │ - Create sponsorships & recurring  │
    └───────────────┬────────────────────┘
                    │
                    ▼
        ┌───────────────────────┐
        │  PHASE 2: CREATE      │
        │  STRIPE SUBSCRIPTIONS │
        └───────────────────────┘
                    │
    ┌───────────────┴──────────────────────────────┐
    │ - Fetch recurring donations (Fundraising App)│
    │ - Create/retrieve Stripe customer            │
    │ - Create Stripe subscription with trial      │
    │ - Store subscription data in recurring model │
    └───────────────┬──────────────────────────────┘
                    │
                    ▼
        ┌───────────────────────┐
        │  PHASE 3: UPLOAD      │
        │  TO SALESFORCE        │
        └───────────────────────┘
                    │
    ┌───────────────┼───────────────┬─────────────────┐
    │               │               │                 │
    ▼               ▼               ▼                 ▼
 STEP 1:       STEP 2:          STEP 3:
 Recurrings    Sponsorships     Donations
 (uploaded     (dependencies    (final sync)
  first)        on recurrings)
```

## Phase Details

### PHASE 1: Repair Donations
**Purpose**: Prepare donations by creating necessary sponsorship and recurring records

**Function Called**: `DonationService.repaireDonations(source: string)`

**Process Flow**:
1. Query donations with:
   - `syncedWithSalesforce: false`
   - `StageName: 'Closed Won'`
   - `Donation_Source__c: [source]` ('Website' or 'Fundraising App')
   - `npsp__Primary_Contact__c: { $ne: null }`

2. For each donation:
   - Iterate through `cartItems`
   - For non-"one-time" donations:
     - Check if `item.type` is "sponsorship"
     - Call `ChildService.reserveChildren()` to reserve children
     - Call `SponsorshipService.repaireSp()` to create sponsorship record
     - Update cart item `type` to "sponsorship"
     - Set appropriate `interval` (monthly/yearly based on amount)

3. Save updated donation

**Execution**:
```typescript
for (const source of ['Website', 'Fundraising App']) {
    const repairs = await this.donationService.repaireDonations(source);
    // Logs success/failure
}
```

### PHASE 2: Create Stripe Subscriptions
**Purpose**: Set up Stripe infrastructure for recurring donations

**Function Called**: `SalesforceService.createRecurringOnStripe(id: string)`

**Process Flow**:
1. Query recurring donations needing Stripe setup:
   - Filter by `recurringSource: 'Fundraising App'`
   - Exclude those with `subscriptionStripe` already set
   - Status must be "Active"
   - `syncedWithSalesforce: true`

2. For each recurring:
   - Fetch linked donation and contact
   - Search for existing Stripe customer by phone metadata
   - Create Stripe customer if not exists
   - Create Stripe price based on amount and frequency
   - Create Stripe subscription with trial period (prevents immediate charge)
   - Store subscription ID and customer ID in recurring model

3. Update recurring record with Stripe data

**Key Design Decision**:
- **Trial Period**: Uses `trial_end` parameter to defer first charge until next billing cycle
- **Customer Deduplication**: Searches by phone number to avoid creating duplicate customers
- **Fault Tolerance**: Continues with next recurring if one fails

**Execution**:
```typescript
const recurrings = await this.recurringService.findAll();
for (const recurring of recurrings) {
    if (recurring.subscriptionStripe && recurring.createOnStripe) {
        continue; // Already processed
    }
    await this.salesforceService.createRecurringOnStripe(recurring._id);
}
```

### PHASE 3: Upload to Salesforce
**Purpose**: Synchronize all processed records to Salesforce

**Execution Order** (CRITICAL for data integrity):

#### STEP 1: Upload Recurring Donations
```typescript
await this.recurringService.uploadRecurringsToSalesforce();
```

**Process**:
- Query recurring donations: `syncedWithSalesforce: false`
- For each recurring, create Salesforce payload with:
  - Frequency, Amount, Contact reference
  - Stripe customer and subscription URLs
  - Payment method
- Call Salesforce API to create `npe03__Recurring_Donation__c` object
- On success:
  - Set `salesforceID`
  - Set `syncedWithSalesforce: true`
  - Update linked donations and sponsorships with recurring Salesforce ID

#### STEP 2: Upload Sponsorships
```typescript
await this.sponsorshipService.uploadSponsorshipsToSalesforce();
```

**Process**:
- Query sponsorships: `syncedWithSalesforce: false`
- For each sponsorship with children:
  - Create separate Salesforce record for each child
  - Include Donor, Status, Start Date, and recurring reference
- For sponsorships without children:
  - Create single Salesforce record
- On success:
  - Set `salesforceID`
  - Set `syncedWithSalesforce: true`

#### STEP 3: Upload Donations
```typescript
await this.donationService.uploadDonationsToSalesforce();
```

**Process**:
- Query donations: `syncedWithSalesforce: false, StageName: 'Closed Won'`
- For each donation with cart items:
  - Match sponsorship items with recurring records by amount and frequency
  - Match recurring items and create new Salesforce recurring donations if needed
  - Create Salesforce opportunity for each item
- On success:
  - Set `syncedWithSalesforce: true`
  - Update cart items with Salesforce IDs

## Concurrency Control

**Problem**: Multiple instances or manual triggers could cause race conditions

**Solution**: Mutex-like flag in memory
```typescript
private isProcessing = false;

// At start of workflow
if (this.isProcessing) {
    this.logger.warn('Workflow already in progress, skipping');
    return;
}
this.isProcessing = true;

// At end (finally block)
this.isProcessing = false;
```

**Limitations**: Only works within single instance. For multi-instance deployments, consider:
- Database-level locking (recommended)
- Distributed locking service (Redis)
- Message queue with exclusive consumers

## Error Handling Strategy

### Phase-Level Errors
- If an entire phase fails, subsequent phases are still skipped
- Full stack trace logged with timestamp

### Record-Level Errors
- Individual record failures don't stop the phase
- Continue processing remaining records
- Count and log successes/failures per phase

### Example:
```typescript
for (const source of sources) {
    try {
        // Process
    } catch (error) {
        logger.error(`Error for ${source}:`, error.message);
        // Continue to next source
    }
}
```

## Logging Strategy

The service provides detailed, structured logging at multiple levels:

1. **Workflow Level**: Start/end of entire workflow with duration
2. **Phase Level**: Start/completion of each of 3 phases
3. **Step Level**: Individual operation details (e.g., source being repaired)
4. **Record Level**: Success/failure for each record
5. **Critical Errors**: Full details when unexpected errors occur

**Example Log Output**:
```
========== STARTING DONATION WORKFLOW ==========
--- PHASE 1: REPAIRING DONATIONS ---
Starting repair for source: Website
Repaired 5 donations from source: Website
Starting repair for source: Fundraising App
Repaired 3 donations from source: Fundraising App
--- PHASE 2: CREATING STRIPE SUBSCRIPTIONS ---
Found 8 recurring donations to process on Stripe
Creating Stripe subscription for recurring [id]
Successfully created Stripe subscription for recurring [id]
Phase 2 completed: 7 succeeded, 1 failed
--- PHASE 3: UPLOADING TO SALESFORCE ---
Step 1: Uploading Recurring Donations...
Successfully uploaded 8 recurring donations
Step 2: Uploading Sponsorships...
Step 3: Uploading Donations...
Successfully uploaded 15 donations
========== DONATION WORKFLOW COMPLETED SUCCESSFULLY (3245ms) ==========
```

## Data Flow & Dependencies

### Donation Source Routes

**Website Donations**:
```
Donation (Website source)
  ├─ Repair Phase
  │  └─ Create Sponsorships (no Stripe)
  │     └─ Link to children
  │
  └─ Upload Phase
     ├─ Sponsorships to Salesforce
     └─ Donations to Salesforce
```

**Fundraising App Donations**:
```
Donation (Fundraising App source)
  ├─ Repair Phase
  │  └─ Create Recurring & Sponsorships
  │
  ├─ Stripe Phase
  │  └─ Create Stripe subscription
  │     ├─ Create Stripe customer (if needed)
  │     └─ Create Stripe subscription with trial
  │
  └─ Upload Phase
     ├─ Recurrings to Salesforce (first)
     ├─ Sponsorships to Salesforce (second)
     └─ Donations to Salesforce (third)
```

## Configuration

### Cron Schedule
- **Pattern**: `EVERY_MINUTE` (every 60 seconds)
- **Timezone**: Server timezone
- **Can be customized**: Change `CronExpression.EVERY_MINUTE` to other patterns:
  - `EVERY_10_SECONDS`
  - `EVERY_30_SECONDS`
  - `EVERY_5_MINUTES`
  - `EVERY_HOUR`
  - Or use cron expression: `@Cron('0 * * * * *')` for every minute

### Module Imports
Required modules in `DonationModule`:
- `RecurringModule` (forwardRef)
- `SponsorshipModule` (forwardRef)
- `SalesforceModule` (forwardRef)
- `ContactModule` (forwardRef)
- `ChildModule` (forwardRef)

## Performance Considerations

1. **Database Queries**:
   - Using batch operations where possible
   - `find()` with specific filters to minimize result sets
   - Indexed queries on: `syncedWithSalesforce`, `StageName`, `Donation_Source__c`

2. **External API Calls**:
   - Salesforce API calls are sequential (not batched)
   - Consider adding batch endpoints if performance is critical
   - Stripe API calls use search and list operations

3. **Timeout Handling**:
   - No timeout configured, relies on individual service timeouts
   - For 1-minute interval, workflow should complete in <30 seconds

4. **Memory Management**:
   - Processing one record at a time (no array loading in memory)
   - Suitable for moderate volumes (< 1000 records per minute)

## Monitoring & Alerts

### Recommended Monitoring Points
1. Cron job failure rate
2. Phase completion times
3. Record processing success rate
4. Stripe subscription creation failures
5. Salesforce API errors

### Health Check Endpoint
```typescript
async getStatus() {
    return {
        isProcessing: this.isProcessing,
        lastCheck: new Date(),
    };
}
```

## Future Enhancements

1. **Batch Processing**: Group Salesforce API calls
2. **Distributed Locking**: For multi-instance deployments
3. **Metrics Export**: Prometheus/CloudWatch integration
4. **Dead Letter Queue**: Store failed records for later retry
5. **Custom Scheduling**: Make cron interval configurable via env
6. **Circuit Breaker**: Auto-disable if Salesforce API has issues
7. **Partial Retry**: Resume from last successful phase on restart

## Usage

The cron service is automatically enabled when the application starts. No manual invocation needed.

```bash
# To run the app with cron jobs
npm run start

# To run in development mode
npm run start:dev
```

## Troubleshooting

### Cron job not running
1. Verify `ScheduleModule.forRoot()` is imported in AppModule
2. Check logs for startup messages
3. Verify `@Cron()` decorator is present
4. Ensure service is provided in module's `providers` array

### Records not syncing
1. Check if donations/recurring have required fields
2. Verify Salesforce authentication is working
3. Check database connectivity
4. Review error logs for specific failure reasons

### Stripe subscription creation failing
1. Verify Stripe API key is configured
2. Check if customer creation is failing (payment method issue)
3. Verify Stripe price exists or can be created
4. Check subscription parameters (trial_end must be future timestamp)

### Memory issues
1. Reduce cron frequency if processing > 1000 records
2. Add pagination to large queries
3. Consider moving to event-driven architecture
