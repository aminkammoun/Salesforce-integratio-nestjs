import { Module } from '@nestjs/common';
import { SalesforceController } from './controller/salesforce.controller';
import { SalesforceService } from './service/salesforce.service';
import { SalesforcesCronService } from './service/salesforce-cron.service';
import { ConfigModule, ConfigService } from '@nestjs/config';

import config from '../../config';
import { ContactModule } from '../contact/contact.module';
import { DonationModule } from '../donation/donation.module';
import { TransactionModule } from '../transaction/transaction.module';
import { SponsorshipModule } from '../sponsorship/sponsorship.module';
import { RecurringModule } from '../recurring/recurring.module';
import { ChildModule } from '../child/child.module';
import { LogModule } from '../log/log.module';

@Module({
    imports: [
        ContactModule,
        DonationModule,
        TransactionModule,
        SponsorshipModule,
        RecurringModule,
        ChildModule,
        LogModule,
        ConfigModule.forRoot({
            load: config,
            isGlobal: true,
        }),
    ],
    controllers: [SalesforceController],
    providers: [SalesforceService, SalesforcesCronService,
        {
            provide: 'STRIPE_API_KEY',
            useFactory: async (configService: ConfigService) =>
                configService.get('STRIPE_API_KEY'),
            inject: [ConfigService],
        },

    ],
})
export class SalesforceModule { }
