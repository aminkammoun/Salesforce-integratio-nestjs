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

@Module({
  imports: [
    ConfigModule.forRoot({
      load: config,
      isGlobal: true,
    }),
    SalesforceModule,
    ContactModule,
    ChildModule,
    TransactionModule,
    DonationModule,
    UserModule,
    AuthModule,

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
