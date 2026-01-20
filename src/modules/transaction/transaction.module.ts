import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Transaction } from './entities/transaction.entity';
import { TransactionSchema } from './entities/transaction.entity';
import { TransactionController } from './controller/transaction.controller';
import { TransactionService } from './service/transaction.service';
import { DonationModule } from '../donation/donation.module';
import { ContactModule } from '../contact/contact.module';
@Module({
    imports: [
        forwardRef(() => DonationModule),
        forwardRef(() => ContactModule),
        MongooseModule.forFeature([{ name: Transaction.name, schema: TransactionSchema }]),
    ],
    controllers: [TransactionController],
    providers: [TransactionService],
    exports: [TransactionService, MongooseModule],
})
export class TransactionModule { }
