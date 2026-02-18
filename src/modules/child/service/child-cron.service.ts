import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Child } from '../entities/child.entity';
import { Sponsorship } from 'src/modules/sponsorship/entities/sponsorship.entity';
import { SponsorshipService } from 'src/modules/sponsorship/service/sponsorship.service';
import { ChildService } from './child.service';
import { LogService } from 'src/modules/log/service/log.service';

@Injectable()
export class ChildCronService {
    private readonly logger = new Logger(ChildCronService.name);

    constructor(
        @InjectModel(Child.name) private readonly childModel: Model<Child>,
        @InjectModel(Sponsorship.name) private readonly sponsorshipModel: Model<Sponsorship>,
        @Inject() private readonly sponsorshipService: SponsorshipService,
        private readonly childService: ChildService,
                private readonly logService: LogService
        
    ) { }

    // Run every minute
    @Cron(CronExpression.EVERY_MINUTE)
    async releaseExpiredReservations() {
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

        // Step 1: Find expired reserved children
        const expiredChildren = await this.childModel.find({
            SalesforceID: { $exists: true },
            Status__c: 'Reserved',
            reservedAt: { $lt: fiveMinutesAgo },
        });

        if (expiredChildren.length === 0) return;

        this.logger.warn(`Releasing ${expiredChildren.length} expired child reservations...`);

        const childIds = expiredChildren.map(c => c.SalesforceID);
        console.log('Expired child IDs to be released:', childIds);
        // Step 2: Release children
        await this.childModel.updateMany(
            { SalesforceID: { $in: childIds } },
            { $set: { Status__c: 'Available', reservedAt: null } },
        );

        // Step 3: Update sponsorships associated with them
        await this.sponsorshipModel.updateMany(
            { child: { $in: childIds }, Status: 'pending' },
            { $set: { Status: 'Expired' } },
        );
        //await this.sponsorshipService.updateToExpired(childIds);

        this.logger.log(`Expired reservations released.`);
    }
    @Cron(CronExpression.EVERY_DAY_AT_3AM)
    async sychFromSalesforce() {
        this.logger.warn(`Starting weekly synchronization of child data from Salesforce...`);
        try {
            const query = "SELECT+Id,+NationalityList__c,+Child_Name__c+,status__c+,Profile_Picture__c+,Age_Calculated__c+From+Child__c+WHERE+Offline_only__c=False";
            await this.childService.insertFromSalesforce(query);
            this.logService.createlog('Child data synchronization completed successfully', 'success', new Date());
        } catch (error) {
            this.logger.error(`Error during child data synchronization: ${error.message}`, error.stack);
        }
    }
}
