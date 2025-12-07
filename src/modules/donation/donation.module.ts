import { forwardRef, Module } from '@nestjs/common';
import { Donation, DonationSchema } from './entities/donation.entity';
import { MongooseModule } from '@nestjs/mongoose';
import { DonationController } from './controller/donation.controller';
import { DonationService } from './service/donation.service';
import { RecurringModule } from '../recurring/recurring.module';
import { RecurringService } from '../recurring/service/recurring.service';
import { ContactModule } from '../contact/contact.module';

@Module({
    imports: [
        forwardRef(() => RecurringModule),
        MongooseModule.forFeature([{ name: Donation.name, schema: DonationSchema }]),
        forwardRef(() => ContactModule)
    ],
    controllers: [DonationController],
    providers: [DonationService],
    // Export the MongooseModule so other modules (like TransactionModule) can inject the Donation model
    exports: [MongooseModule, DonationService],
})
export class DonationModule { }
