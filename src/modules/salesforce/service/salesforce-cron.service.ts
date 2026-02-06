import { Injectable, Inject } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ContactService } from 'src/modules/contact/service/contact.service';

@Injectable()
export class SalesforcesCronService {
    constructor(
        @Inject() private readonly contactService: ContactService
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
}
