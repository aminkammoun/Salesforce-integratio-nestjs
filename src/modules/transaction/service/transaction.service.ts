import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { CreateTransactionDto } from '../dto/create-transaction.dto';
import { UpdateTransactiontDto } from '../dto/update-transaction.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types as MongooseTypes } from 'mongoose';
import { Transaction } from '../entities/transaction.entity';
@Injectable()
export class TransactionService {
    constructor(
        @InjectModel(Transaction.name) private readonly TransactionModel: Model<Transaction>,
    ) { }
    // This service would typically contain methods to handle business logic related to transactions
    // For example, methods to create, update, delete, and retrieve transactions
    // Currently, it is empty as per the provided code snippet
    async create(createArticleDto: CreateTransactionDto) {
        try {
            let transaction = new this.TransactionModel({
                ...createArticleDto,
            });
            const response = await transaction.save();
            return response;
        } catch (error) {
            throw new InternalServerErrorException(error);
        }
    }

    async findAll() {
        try {
            const transactions = await this.TransactionModel.find();
            return transactions;
        } catch (error) {
            throw new InternalServerErrorException(error);
        }
    }
    findOne(id: string) {
        try {
            const transaction = this.TransactionModel.findById(new MongooseTypes.ObjectId(id));
            return transaction;
        } catch (error) {
            throw new InternalServerErrorException(error);
        }
    }
    async delete(id: string) {
        try {
            const result = await this.TransactionModel.findByIdAndDelete(new MongooseTypes.ObjectId(id));
            return result;
        } catch (error) {
            throw new InternalServerErrorException(error);
        }
    }
    async update(id: string, updateTransactionDto: UpdateTransactiontDto) {
        try {
            const transaction = await this.TransactionModel.findByIdAndUpdate(
                new MongooseTypes.ObjectId(id),
                { $set: updateTransactionDto },
                { new: true },
            );
            if (!transaction) {
                throw new NotFoundException('transaction does not exists');
            }

            await transaction.save();
            return transaction;
        } catch (error) {
            throw new InternalServerErrorException(error);
        }
    }
}
