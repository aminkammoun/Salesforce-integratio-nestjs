import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { TransactionService } from '../service/transaction.service';
import { CreateTransactionDto } from '../dto/create-transaction.dto';
import { UpdateTransactiontDto } from '../dto/update-transaction.dto';
import { ApiTags } from '@nestjs/swagger';

@Controller('transaction')
export class TransactionController {
    constructor(private readonly transactionService: TransactionService) { }
    @Get()
    findAll() {
        // This method would typically call a service to retrieve transactions
        return this.transactionService.findAll();
    }
    @Post('/create')
    create(@Body() createTransactionDto: CreateTransactionDto) {
        // This method would typically call a service to create a new transaction
        return this.transactionService.create(createTransactionDto);
    }
    @Get('/:id')
    findOne(@Param('id') id: string) {
        // This method would typically call a service to retrieve a specific transaction by ID
        return this.transactionService.findOne(id);
    }
    @Post('/update/:id')
    update(@Param('id') id: string, @Body() updateTransactionDto: UpdateTransactiontDto) {
        // This method would typically call a service to update a specific transaction by ID
        return this.transactionService.update(id, updateTransactionDto);
    }
    @Post('/delete/:id')
    delete(@Param('id') id: string) {
        // This method would typically call a service to delete a specific transaction by ID
        return this.transactionService.delete(id);
    }
    @Post('/sync-salesforce-donations')
    async syncSalesforceDonations() {
        return this.transactionService.updateTransactionsWithSalesforceDonation();
    }
}
