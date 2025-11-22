import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Contact } from './entities/contact.entity';
import { ContactSchema } from './entities/contact.entity';
import { ContactController } from './controller/contact.controller';
import { ContactService } from './service/contact.service';
import { DonationModule } from '../donation/donation.module';
import { SponsorshipModule } from '../sponsorship/sponsorship.module';
import { RecurringModule } from '../recurring/recurring.module';
@Module({
  imports: [
    DonationModule,
    SponsorshipModule,
    RecurringModule,
    MongooseModule.forFeature([{ name: Contact.name, schema: ContactSchema }]),
  ],
  controllers: [ContactController],
  providers: [ContactService],
  exports: [ContactService],
})
export class ContactModule { }
