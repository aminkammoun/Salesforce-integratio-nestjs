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