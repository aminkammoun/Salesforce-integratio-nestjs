import { Module } from '@nestjs/common';
import { Donation, DonationSchema } from './entities/donation.entity';
import { MongooseModule } from '@nestjs/mongoose';
import { DonationController } from './controller/donation.controller';
import { DonationService } from './service/donation.service';
import { RecurringModule } from '../recurring/recurring.module';
import { RecurringService } from '../recurring/service/recurring.service';

@Module({
    imports: [
        RecurringModule,
        MongooseModule.forFeature([{ name: Donation.name, schema: DonationSchema }]),
    ],
    controllers: [DonationController],
    providers: [DonationService],
    // Export the MongooseModule so other modules (like TransactionModule) can inject the Donation model
    exports: [MongooseModule, DonationService],
})
export class DonationModule { }
