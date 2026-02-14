# Donation Workflow Implementation Summary

## What Was Created

A **robust, production-ready cron job service** that processes the complete donation workflow every minute. The implementation focuses on **data consistency**, **error handling**, and **operational visibility**.

---

## Files Created/Modified

### 1. **NEW**: [src/modules/donation/service/donation-cron.service.ts](src/modules/donation/service/donation-cron.service.ts)
The main orchestration service with 3 phases:
- **PHASE 1**: Repair donations from Website and Fundraising App sources
- **PHASE 2**: Create Stripe subscriptions for Fundraising App recurring donations  
- **PHASE 3**: Upload repaired/synced records to Salesforce

**Key Features**:
- Concurrency prevention (mutex-like flag)
- Structured error handling per phase
- Detailed logging at each step
- Execution time tracking

### 2. **MODIFIED**: [src/modules/donation/donation.module.ts](src/modules/donation/donation.module.ts)
- Added import of `DonationCronService`
- Added `SalesforceModule` and `SponsorshipModule` imports
- Added `DonationCronService` to providers and exports
- Ensured all dependencies are available via forwardRef

### 3. **DOCUMENTATION**: [DONATION_WORKFLOW_ARCHITECTURE.md](DONATION_WORKFLOW_ARCHITECTURE.md)
Comprehensive architecture documentation including:
- Multi-phase pipeline pattern
- Detailed process flows with decision trees
- Concurrency control strategy
- Error handling approach
- Data flow diagrams
- Performance considerations
- Troubleshooting guide

---

## System Architecture

### Multi-Phase Pipeline Design

```
┌────────────────────────────────────────────────────┐
│         DONATION WORKFLOW (EVERY 1 MINUTE)         │
│        Concurrent Execution Prevention             │
└────────────────────────────────────────────────────┘
                        │
        ┌───────────────┴───────────────┐
        │                               │
        ▼                               ▼
    ┌────────────┐              ┌──────────────┐
    │  PHASE 1   │──────────▶   │ PHASE SKIP?  │
    │   REPAIR   │              │ (isProcessing)
    │ DONATIONS  │              └──────────────┘
    └────────────┘
        │
    ┌─────────────────────────┐
    │ • Repair 'Website' src  │
    │ • Repair 'App' src      │
    │ • Create sponsorships   │
    │ • Create recurring      │
    └────────────┬────────────┘
                │
                ▼
    ┌────────────────────────┐
    │      PHASE 2           │
    │  CREATE STRIPE         │
    │  SUBSCRIPTIONS         │
    └────────────────────────┘
        │
    ┌─────────────────────────┐
    │ • Find recurrings       │
    │ • Create Stripe cust    │
    │ • Create subscription   │
    │ • Store subscription ID │
    └────────────┬────────────┘
                │
                ▼
    ┌────────────────────────┐
    │      PHASE 3           │
    │   UPLOAD TO            │
    │  SALESFORCE            │
    └────────────────────────┘
        │
    ┌───────────┬────────────┬──────────┐
    │           │            │          │
    ▼           ▼            ▼          ▼
  STEP1:     STEP2:       STEP3:      DONE
  Upload    Upload        Upload      │
  Recurring Sponsorships  Donations   │
  (First)   (Second)      (Third)     │
    │           │            │        │
    └───────────┴────────────┴────────┘
```

### Donation Processing Routes

**Website Source**:
```
Donation (Website)
    ↓
[PHASE 1] Repair → Create Sponsorships (no Stripe)
    ↓
[PHASE 2] Skipped (not Fundraising App)
    ↓
[PHASE 3] Upload:
    • Sponsorships → Salesforce
    • Donations → Salesforce
```

**Fundraising App Source**:
```
Donation (Fundraising App)
    ↓
[PHASE 1] Repair → Create Recurring + Sponsorships
    ↓
[PHASE 2] Stripe → Create Subscription + Customer
    ↓
[PHASE 3] Upload:
    • Recurring → Salesforce (first)
    • Sponsorships → Salesforce (second)
    • Donations → Salesforce (third)
```

---

## Key Design Decisions

### 1. **Sequential Phase Execution**
Each phase must complete before the next starts to maintain data consistency.

```typescript
await this.phase1RepairDonations();      // Must complete first
await this.phase2CreateStripeSubscriptions(); // Then this
await this.phase3UploadToSalesforce();  // Then this
```

### 2. **Salesforce Upload Order is Critical**

Why upload Recurring **first**?
- Sponsorships reference recurring donations
- Donations reference both recurring and sponsorships
- If we upload donations first, they fail to link to recurring

```
Recurrings → Sponsorships → Donations
(must be first)  (depends on recurring) (depends on all)
```

### 3. **Stripe Trial Period Prevents Immediate Charges**

```typescript
// Don't charge on subscription creation, wait until next billing cycle
const subscription = await this.createStripeSubscription({
    trial_end: billingCycleAnchor,  // Charge only after trial
});
```

### 4. **Concurrency Protection**

```typescript
if (this.isProcessing) {
    logger.warn('Already running, skipping this execution');
    return;
}
this.isProcessing = true;
try {
    // Process
} finally {
    this.isProcessing = false;
}
```

**Note**: For multi-instance deployments, upgrade to database-level locking.

### 5. **Fault Isolation Pattern**

Individual record failures don't crash entire phase:

```typescript
for (const item of items) {
    try {
        await processItem(item);
    } catch (error) {
        logger.error(`Failed for ${item.id}:`, error);
        continue; // Process next item
    }
}
```

---

## Function Mapping

### Functions Used (Existing Services)

| Function | Service | Purpose |
|----------|---------|---------|
| `repaireDonations(source)` | DonationService | Create sponsorships/recurring for unprocessed donations |
| `createRecurringOnStripe(id)` | SalesforceService | Set up Stripe customer + subscription |
| `uploadRecurringsToSalesforce()` | RecurringService | Sync recurring donations to Salesforce |
| `uploadSponsorshipsToSalesforce()` | SponsorshipService | Sync sponsorships to Salesforce |
| `uploadDonationsToSalesforce()` | DonationService | Sync donations to Salesforce |
| `findAll()` | RecurringService | Get active recurring for Stripe processing |

---

## Configuration

### Cron Schedule
**Location**: [src/modules/donation/service/donation-cron.service.ts](src/modules/donation/service/donation-cron.service.ts#L33)

```typescript
@Cron(CronExpression.EVERY_MINUTE)  // Every 60 seconds
async processFullDonationWorkflow()
```

**To Change Schedule**:
```typescript
// Every 10 seconds
@Cron(CronExpression.EVERY_10_SECONDS)

// Every 5 minutes  
@Cron(CronExpression.EVERY_5_MINUTES)

// Every hour
@Cron(CronExpression.EVERY_HOUR)

// Custom (every minute at second 0)
@Cron('0 * * * * *')
```

### Module Registration
**Location**: [src/modules/donation/donation.module.ts](src/modules/donation/donation.module.ts)

Automatically registered when app starts (no manual invocation needed).

---

## Execution Flow with Examples

### Example Scenario: Mixed Donations

```
TIME: 12:00 PM
─────────────────────────────────────────

INPUT DATA:
┌─────────────────────────────────────────┐
│ 10 Website donations (unrepaired)       │
│ 15 Fundraising App donations (unrepaired)
│ 8 Existing recurring needing Stripe     │
└─────────────────────────────────────────┘

EXECUTION:
──────────────────────────────────────────

[12:00:00] Workflow Start
  
  PHASE 1: REPAIR DONATIONS
  ├─ Repair source 'Website'
  │  └─ Create sponsorships: 7 success, 3 failed (no children)
  ├─ Repair source 'Fundraising App'
  │  └─ Create recurring: 12 success, 3 failed (invalid amounts)
  └─ Phase 1 Complete: 19 donations processed
  
  PHASE 2: CREATE STRIPE SUBSCRIPTIONS  
  ├─ Find recurring needing Stripe: 8 found
  ├─ Create customer: 5 new, 3 existing
  ├─ Create subscription: 7 success, 1 failed (invalid price)
  └─ Phase 2 Complete: 7 subscriptions created
  
  PHASE 3: UPLOAD TO SALESFORCE
  ├─ Step 1: Upload recurrings
  │  └─ 8 recurring → Salesforce (all success)
  ├─ Step 2: Upload sponsorships  
  │  └─ 7 sponsorships → Salesforce (all success)
  ├─ Step 3: Upload donations
  │  └─ 25 donations → Salesforce (all success)
  └─ Phase 3 Complete
  
[12:00:35] Workflow Complete (35 seconds, 40 records processed)
```

### Example Log Output

```log
[12:00:00] ========== STARTING DONATION WORKFLOW ==========
[12:00:00] --- PHASE 1: REPAIRING DONATIONS ---
[12:00:00] Starting repair for source: Website
[12:00:02] Repaired 7 donations from source: Website
[12:00:02] Starting repair for source: Fundraising App
[12:00:04] Repaired 12 donations from source: Fundraising App
[12:00:04] Phase 1 Results: [{source: "Website", count: 7, status: "success"}, ...]
[12:00:04] --- PHASE 2: CREATING STRIPE SUBSCRIPTIONS ---
[12:00:04] Found 8 recurring donations to process on Stripe
[12:00:05] Creating Stripe subscription for recurring 507f1f77bcf86cd799439011
[12:00:06] Successfully created Stripe subscription for recurring 507f1f77bcf86cd799439011
[12:00:06] (... more recurring processing ...)
[12:00:10] Phase 2 completed: 7 succeeded, 1 failed
[12:00:10] --- PHASE 3: UPLOADING TO SALESFORCE ---
[12:00:10] Step 1: Uploading Recurring Donations to Salesforce...
[12:00:15] Successfully uploaded 8 recurring donations
[12:00:15] Step 2: Uploading Sponsorships to Salesforce...
[12:00:20] Successfully uploaded sponsorships to Salesforce
[12:00:20] Step 3: Uploading Donations to Salesforce...
[12:00:25] Successfully uploaded 25 donations
[12:00:25] Phase 3 Results: {recurrings: {success: 8, error: 0}, ...}
[12:00:25] ========== DONATION WORKFLOW COMPLETED SUCCESSFULLY (25s) ==========
```

---

## Error Scenarios & Handling

### Scenario 1: Repair Phase Fails for One Source
```
❌ Website repair fails (e.g., Salesforce auth error)
✅ Fundraising App repair continues
✅ Remaining phases execute
Result: Website donations skipped, App donations processed
```

### Scenario 2: Stripe Subscription Creation Fails for One Recurring
```
✅ Recurring 1-7 successfully create subscriptions
❌ Recurring 8 fails (invalid customer data)
✅ Phase 3 still executes
Result: 7 subscriptions synced to Salesforce, 1 remains unsynced
```

### Scenario 3: Salesforce Upload Fails Entirely
```
❌ Phase 3 fails (network error)
✅ Donations stay in MongoDB with syncedWithSalesforce: false
⏰ Retry happens in next 1-minute execution
Result: No data loss, automatic recovery
```

### Scenario 4: Workflow Already Processing
```
[12:00:00] Workflow starts
[12:00:30] Still processing Phase 3...
[12:01:00] New execution attempt
⚠️ isProcessing flag is true
✅ Skips execution
Result: Prevents concurrent processing
```

---

## Monitoring Recommendations

### Key Metrics to Track

1. **Success Rate**: Donations processed / Donations attempted
2. **Phase Duration**: Time spent in each phase
3. **Failure Rate**: Failed records / Total records
4. **Stripe Failures**: Subscription creation failures
5. **Salesforce API Errors**: Upload failures

### Log Levels

- **ERROR**: Critical failures (phase-level errors, unrecoverable issues)
- **WARN**: Concurrency prevention, skipped items
- **LOG**: Phase start/end, record processing, success counts

---

## Testing Checklist

- [ ] Verify ScheduleModule is enabled in AppModule
- [ ] Check logs show workflow starting every minute
- [ ] Test with Website donations only
- [ ] Test with Fundraising App donations only
- [ ] Test with mixed donations
- [ ] Verify Stripe subscriptions are created
- [ ] Verify Salesforce records are uploaded in correct order
- [ ] Check error handling for single record failures
- [ ] Test concurrent execution prevention
- [ ] Verify logs match expected output format

---

## Known Limitations & Future Work

### Current Limitations
1. **Single Instance Only**: In-memory mutex won't work across multiple instances
2. **No Batch Salesforce API**: Makes individual API calls (slower for large volumes)
3. **Fixed Cron Interval**: Can't adjust schedule without code change
4. **No Dead Letter Queue**: Failed records aren't automatically retried

### Recommended Enhancements

**Priority 1** (High):
- [ ] Database-level locking for multi-instance support
- [ ] Batch Salesforce API calls
- [ ] Configurable cron interval via environment variable

**Priority 2** (Medium):
- [ ] Dead letter queue for failed records
- [ ] Prometheus metrics export
- [ ] Circuit breaker for Salesforce API

**Priority 3** (Low):
- [ ] Event-driven architecture instead of polling
- [ ] Partial phase recovery on restart
- [ ] Custom retry policies per error type

---

## Getting Started

### 1. Verify Setup
```bash
# Check that ScheduleModule is in app.module
grep "ScheduleModule" src/modules/app/app.module.ts

# Check that DonationModule is imported
grep "DonationModule" src/modules/app/app.module.ts
```

### 2. Start Application
```bash
npm run start:dev
```

### 3. Check Logs
```bash
# Look for startup message
# Should see: "========== STARTING DONATION WORKFLOW =========="
# Every 60 seconds
```

### 4. Monitor Processing
```bash
# Watch real-time logs
tail -f logs/application.log | grep "DONATION WORKFLOW"
```

---

## Support & Troubleshooting

See **[DONATION_WORKFLOW_ARCHITECTURE.md](DONATION_WORKFLOW_ARCHITECTURE.md)** for detailed:
- Architecture deep dive
- Troubleshooting guide
- Performance tuning
- Multi-instance deployment strategy
