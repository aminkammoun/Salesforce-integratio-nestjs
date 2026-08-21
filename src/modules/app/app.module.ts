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
import { Orders } from '../orders/entities/orders.entity';
import { OrdersModule } from '../orders/orders.module';
import { ErrorsModule } from '../errors/errors.module';
import { LeadModule } from '../lead/lead.module';
import { TypeOrmModule } from '@nestjs/typeorm'; // Add this line
import { NeonDatabaseModule } from '../../config/neon.config'
import { NeondbModule } from '../neondb/neondb.module';
import { NeonDatabaseControleModule } from 'src/config/neon.controle';
/**
 * Application root module that configures the NestJS application.
 * 
 * Sets up configuration management, event emitting, and scheduling modules.
 * Integrates multiple feature modules for Salesforce, contacts, transactions, donations, and more.
 * 
 * Configures two databases:
 * - MongoDB connection via Mongoose with URI from `database.uri` config
 * - PostgreSQL connection via TypeORM with Neon database URL from `neon.url` config
 * 
 * The `neon.url` configuration value should be defined in:
 * - Environment variables (e.g., `NEON_URL`)
 * - Config files loaded by `ConfigModule.forRoot()` via the `config` array
 * - Typically in `.env`, `.env.local`, or config JSON files in the project root
 * 
 * @module AppModule
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      load: config,
      isGlobal: true,
    }),
    EventEmitterModule.forRoot(),
    //NeonDatabaseModule,
    SalesforceModule,
    ContactModule,
    ChildModule,
    TransactionModule,
    DonationModule,
    UserModule,
    AuthModule,
    SponsorshipModule,
    RecurringModule,
    OrdersModule,
    ErrorsModule,
    LeadModule,
    //NeondbModule,
    //NeonDatabaseControleModule,
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
