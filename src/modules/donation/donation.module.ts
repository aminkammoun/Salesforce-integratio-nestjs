import { forwardRef, Module } from '@nestjs/common';
import { Donation, DonationSchema } from './entities/donation.entity';
import { MongooseModule } from '@nestjs/mongoose';
import { DonationController } from './controller/donation.controller';
import { DonationService } from './service/donation.service';
import { RecurringModule } from '../recurring/recurring.module';
import { RecurringService } from '../recurring/service/recurring.service';
import { ContactModule } from '../contact/contact.module';
import { ChildModule } from '../child/child.module';
import { SponsorshipModule } from '../sponsorship/sponsorship.module';
import { DonationCreationListener } from './listener/donation.creation.listener';

@Module({
    imports: [
        forwardRef(() => RecurringModule),
        MongooseModule.forFeature([{ name: Donation.name, schema: DonationSchema }]),
        forwardRef(() => ContactModule),
        forwardRef(() => ChildModule),
        forwardRef(() => SponsorshipModule)
    ],
    controllers: [DonationController],
    providers: [DonationService, DonationCreationListener],
    // Export the MongooseModule so other modules (like TransactionModule) can inject the Donation model
    exports: [MongooseModule, DonationService],
})
export class DonationModule { }
