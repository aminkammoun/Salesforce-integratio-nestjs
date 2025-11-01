import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Transaction } from './entities/transaction.entity';
import { TransactionSchema } from './entities/transaction.entity';
import { TransactionController } from './controller/transaction.controller';
import { TransactionService } from './service/transaction.service';
import { DonationModule } from '../donation/donation.module';
@Module({
    imports: [
        DonationModule,
        MongooseModule.forFeature([{ name: Transaction.name, schema: TransactionSchema }]),
    ],
    controllers: [TransactionController],
    providers: [TransactionService],
})
export class TransactionModule {   }
