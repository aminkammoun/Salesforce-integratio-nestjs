import { Module } from '@nestjs/common';
import { SalesforceController } from './controller/salesforce.controller';
import { SalesforceService } from './service/salesforce.service';
import { ConfigModule } from '@nestjs/config';

import config from '../../config';

@Module({
    imports: [
        ConfigModule.forRoot({
            load: config,
            isGlobal: true,
        }),
    ],
    controllers: [SalesforceController],
    providers: [SalesforceService],
})
export class SalesforceModule { }
