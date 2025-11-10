import { Module } from '@nestjs/common';
import { Sponsorship, SponsorshipSchema } from './entities/sponsorship.entity';
import { MongooseModule } from '@nestjs/mongoose';
import { SponsorshipController } from './controller/sponsorship.controller';
import { SponsorshipService } from './service/sponsorship.service';
import { RecurringModule } from '../recurring/recurring.module';
@Module({
    imports: [
        RecurringModule,
        MongooseModule.forFeature([{ name: Sponsorship.name, schema: SponsorshipSchema }]),
    ],
    controllers: [SponsorshipController],
    providers: [SponsorshipService],
    // Export the MongooseModule so other modules (like TransactionModule) can inject the Sponsorship model
    exports: [MongooseModule, SponsorshipService],
})
export class SponsorshipModule {


}
