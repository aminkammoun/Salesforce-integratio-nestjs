import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import config from '../../config';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SalesforceModule } from '../salesforce/salesforce.module';
import { ContactModule } from '../contact/contact.module';
import { ChildModule } from '../child/child.module';
import { TransactionModule } from '../transaction/transaction.module';
import { DonationModule } from '../donation/donation.module';
import { UserModule } from '../user/user.module';
import { AuthModule } from '../auth/auth.module';
import { SponsorshipModule } from '../sponsorship/sponsorship.module';
import { RecurringModule } from '../recurring/recurring.module';
import { ScheduleModule } from '@nestjs/schedule';
import { EventEmitterModule } from '@nestjs/event-emitter';

@Module({
  imports: [
    ConfigModule.forRoot({
      load: config,
      isGlobal: true,
    }),
    EventEmitterModule.forRoot(),
    ScheduleModule.forRoot(), //this is required
    SalesforceModule,
    ContactModule,
    ChildModule,
    TransactionModule,
    DonationModule,
    UserModule,
    AuthModule,
    SponsorshipModule,
    RecurringModule,
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        uri: config.get<string>('database.uri'),
        useNewUrlParser: true,
        useUnifiedTopology: true,
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
