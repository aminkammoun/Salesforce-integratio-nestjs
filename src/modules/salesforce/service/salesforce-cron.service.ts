import { Injectable, Inject, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ContactService } from 'src/modules/contact/service/contact.service';
import { DonationService } from 'src/modules/donation/service/donation.service';
import { RecurringService } from 'src/modules/recurring/service/recurring.service';
import { SponsorshipService } from 'src/modules/sponsorship/service/sponsorship.service';
import { SalesforceService } from './/salesforce.service';
interface RepairResult {
    source: string;
    count?: number;
    status: string;
    error?: string;
}

interface UploadResults {
    recurrings: { success: number; error: number };
    sponsorships: { success: number; error: number };
    donations: { success: number; error: number };
}
@Injectable()
export class SalesforcesCronService {
    private readonly logger = new Logger(SalesforcesCronService.name);
    private isProcessing = false;
    constructor(
        @Inject() private readonly contactService: ContactService,
        private readonly donationService: DonationService,
        private readonly recurringService: RecurringService,
        private readonly sponsorshipService: SponsorshipService,
        private readonly salesforceService: SalesforceService,
    ) { }

    @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
    async uploadContactsToSalesforceDaily() {
        try {
            console.log('Starting daily contacts upload to Salesforce...');
            const result = await this.contactService.updloadContactsToSalesforce();
            console.log('Daily contacts upload to Salesforce completed:', result);
        } catch (error) {
            console.error('Error during daily contacts upload to Salesforce:', error);
        }
    }

    @Cron(CronExpression.EVERY_HOUR)
    async uploadContactsToSalesforceHourly() {
        try {
            console.log('Starting hourly contacts upload to Salesforce...');
            const result = await this.contactService.updloadContactsToSalesforce();
            console.log('Hourly contacts upload to Salesforce completed:', result);
        } catch (error) {
            console.error('Error during hourly contacts upload to Salesforce:', error);
        }
    }

    @Cron('0 30 * * * *') // Runs at 30 minutes past every hour (30 min after uploadContactsToSalesforceHourly)
    async processFullDonationWorkflow() {

        if (this.isProcessing) {
            this.logger.warn('Donation workflow already in progress, skipping this execution');
            return;
        }

        this.isProcessing = true;
        const startTime = Date.now();

        try {
            this.logger.log('========== STARTING DONATION WORKFLOW ==========');

            await this.phase1RepairDonations();

            await this.phase2CreateStripeSubscriptions();

            await this.phase3UploadToSalesforce();

            const duration = Date.now() - startTime;
            this.logger.log(`========== DONATION WORKFLOW COMPLETED SUCCESSFULLY (${duration}ms) ==========`);

        } catch (error) {
            this.logger.error(`CRITICAL ERROR in donation workflow: ${error.message}`, error.stack);
        } finally {
            this.isProcessing = false;
        }
    }


    private async phase1RepairDonations(): Promise<RepairResult[]> {
        try {
            this.logger.log('--- PHASE 1: REPAIRING DONATIONS ---');

            const sources = ['Website', 'Fundraising App'];
            const repairResults: RepairResult[] = [];

            for (const source of sources) {
                try {
                    this.logger.log(`Starting repair for source: ${source}`);

                    const repairs = await this.donationService.repaireDonations(source);

                    repairResults.push({
                        source,
                        count: repairs?.length || 0,
                        status: 'success',
                    });

                    this.logger.log(`Repaired ${repairs?.length || 0} donations from source: ${source}`);

                } catch (error) {
                    this.logger.error(`Error repairing donations from source ${source}:`, (error as Error).message);
                    repairResults.push({
                        source,
                        status: 'error',
                        error: (error as Error).message,
                    });
                }
            }

            this.logger.log('Phase 1 Results:', repairResults);
            return repairResults;

        } catch (error) {
            this.logger.error('PHASE 1 FAILED:', error);
            throw error;
        }
    }


    private async phase2CreateStripeSubscriptions(): Promise<void> {
        try {
            this.logger.log('--- PHASE 2: CREATING STRIPE SUBSCRIPTIONS ---');
            this.logger.log('Processing all recurring donations that need Stripe subscriptions...');

            await this.salesforceService.createRecurringOnStripe();

            this.logger.log('Phase 2 completed: Stripe subscriptions created for all eligible recurrings');

        } catch (error) {
            this.logger.error('PHASE 2 FAILED:', error);
            throw error;
        }
    }
    private async phase3UploadToSalesforce(): Promise<UploadResults> {
        try {
            this.logger.log('--- PHASE 3: UPLOADING TO SALESFORCE ---');

            const uploadResults: UploadResults = {
                recurrings: { success: 0, error: 0 },
                sponsorships: { success: 0, error: 0 },
                donations: { success: 0, error: 0 },
            };

            try {
                this.logger.log('Step 1: Uploading Recurring Donations to Salesforce...');
                const recurrings = await this.recurringService.uploadRecurringsToSalesforce();
                uploadResults.recurrings.success = recurrings?.length || 0;
                this.logger.log(`Successfully uploaded ${recurrings?.length || 0} recurring donations`);
            } catch (error) {
                this.logger.error('Error uploading recurring donations:', (error as Error).message);
                uploadResults.recurrings.error++;
            }

            try {
                this.logger.log('Step 2: Uploading Sponsorships to Salesforce...');
                await this.sponsorshipService.uploadSponsorshipsToSalesforce();
                this.logger.log('Successfully uploaded sponsorships to Salesforce');
            } catch (error) {
                this.logger.error('Error uploading sponsorships:', (error as Error).message);
                uploadResults.sponsorships.error++;
            }

            try {
                this.logger.log('Step 3: Uploading Donations to Salesforce...');
                const donations = await this.donationService.uploadDonationsToSalesforce();
                uploadResults.donations.success = donations?.length || 0;
                this.logger.log(`Successfully uploaded ${donations?.length || 0} donations`);
            } catch (error) {
                this.logger.error('Error uploading donations:', (error as Error).message);
                uploadResults.donations.error++;
            }

            this.logger.log('Phase 3 Results:', uploadResults);
            return uploadResults;

        } catch (error) {
            this.logger.error('PHASE 3 FAILED:', error);
            throw error;
        }
    }

    async getStatus() {
        return {
            isProcessing: this.isProcessing,
            lastCheck: new Date(),
        };
    }
}
