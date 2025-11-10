import { Module } from '@nestjs/common';
import { SalesforceController } from './controller/salesforce.controller';
import { SalesforceService } from './service/salesforce.service';
import { ConfigModule, ConfigService } from '@nestjs/config';

import config from '../../config';
import { ContactModule } from '../contact/contact.module';
import { DonationModule } from '../donation/donation.module';
import { TransactionModule } from '../transaction/transaction.module';

@Module({
    imports: [
        ContactModule,
        DonationModule,
        TransactionModule,
        ConfigModule.forRoot({
            load: config,
            isGlobal: true,
        }),
    ],
    controllers: [SalesforceController],
    providers: [SalesforceService,
        {
            provide: 'STRIPE_API_KEY',
            useFactory: async (configService: ConfigService) =>
                configService.get('STRIPE_API_KEY'),
            inject: [ConfigService],
        },

    ],
})
export class SalesforceModule { }
