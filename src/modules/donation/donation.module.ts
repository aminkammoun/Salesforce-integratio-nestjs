import { forwardRef, Module } from '@nestjs/common';
import { Donation, DonationSchema } from './entities/donation.entity';
import { MongooseModule } from '@nestjs/mongoose';
import { DonationController } from './controller/donation.controller';
import { DonationService } from './service/donation.service';
import { DonationCronService } from './service/donation-cron.service';
import { RecurringModule } from '../recurring/recurring.module';
import { RecurringService } from '../recurring/service/recurring.service';
import { ContactModule } from '../contact/contact.module';
import { ChildModule } from '../child/child.module';
import { SponsorshipModule } from '../sponsorship/sponsorship.module';
import { SalesforceModule } from '../salesforce/salesforce.module';

@Module({
    imports: [
        forwardRef(() => RecurringModule),
        forwardRef(() => SponsorshipModule),
        forwardRef(() => SalesforceModule),
        MongooseModule.forFeature([{ name: Donation.name, schema: DonationSchema }]),
        forwardRef(() => ContactModule),
        forwardRef(() => ChildModule),
    ],
    controllers: [DonationController],
    providers: [DonationService, DonationCronService],
    // Export the MongooseModule so other modules (like TransactionModule) can inject the Donation model
    exports: [MongooseModule, DonationService, DonationCronService],
})
export class DonationModule { }
