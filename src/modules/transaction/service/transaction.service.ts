import { Injectable, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common';
import { CreateTransactionDto } from '../dto/create-transaction.dto';
import { UpdateTransactiontDto } from '../dto/update-transaction.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types as MongooseTypes, Types } from 'mongoose';
import { Transaction } from '../entities/transaction.entity';
import { Donation } from 'src/modules/donation/entities/donation.entity';
import { Contact } from 'src/modules/contact/entities/contact.entity';
import { authenticateSalesforce, handleQuery, handleUpdateQuery } from 'src/config/utils';
@Injectable()
export class TransactionService {
    private readonly logger = new Logger(TransactionService.name);
    constructor(
        @InjectModel(Donation.name) private donationModel: Model<Donation>,
        @InjectModel(Contact.name) private contactModel: Model<Contact>,
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

    async updateTransactionsWithSalesforceDonation(): Promise<void> {
        console.log('updateTransactionsWithSalesforceDonation called');
        // Get all donations
        const transactions = await this.TransactionModel.find({ salesforceDonation: { $exists: false } }).select(['donation']).lean();
        console.log('Donations fetched:', transactions);
        let updatedCount = 0;

        for (const trans of transactions) {
            console.log('aa')
            console.log(`Processing donation: ${trans.donation}`);
            const donation = await this.donationModel.findById(trans.donation);
            if (!donation || !donation.cartItems || !donation.cartItems[0].sfId) continue;
            // Ensure ObjectId format
            console.log(`Processing donation ID: ${donation._id}, Salesforce ID: ${donation.cartItems[0].sfId}`);
            // Update all related transactions
            let result;
            if (donation.cartItems.length > 1) {
                this.logger.warn(
                    `Donation ${donation.salesforceID} has multiple cart items. Only the first one will be used.`,
                );
                var tab: string[] = []
                for (let i = 0; i < donation.cartItems.length; i++) {
                    tab.push(donation.cartItems[i].sfId);
                }
                result = await this.TransactionModel.updateMany(
                    { donation: donation._id },
                    { $set: { salesforceDonation: tab } },
                );
            } else {
                result = await this.TransactionModel.updateMany(
                    { donation: donation._id },
                    { $set: { salesforceDonation: [donation.cartItems[0].sfId] } },
                );
                console.log(result.modifiedCount)
            }
            if (result.modifiedCount > 0) {
                updatedCount += result.modifiedCount;
                this.logger.log(
                    `Updated ${result.modifiedCount} transaction(s) for donation ${donation.salesforceID}`,
                );
            }
        }

        this.logger.log(`✅ Completed. Total updated transactions: ${updatedCount}`);
    }
    async findByDonationId(donationId: string) {
        try {
            const transactions = await this.TransactionModel.find({ donation: new MongooseTypes.ObjectId(donationId) });
            return transactions;
        } catch (error) {
            throw new InternalServerErrorException(error);
        }
    }
    async updateTransactionWithContactSalesforceID() {
        try {
            const result = await this.TransactionModel.find({ contact: null, Payment__Contact__c: { $ne: null } })
            for (const tran of result) {
                const contact = await this.contactModel.findOne({ _id: tran.Payment__Contact__c });
                if (contact && contact.salesforceID) {
                    tran.contact = contact.salesforceID;
                    //tran.Payment__Contact__c = contact.salesforceID;
                    await tran.save();
                    this.logger.log(`Updated transaction ${tran._id} with contact Salesforce ID ${contact.salesforceID}`);
                }
            }
        } catch (error) {
            throw new InternalServerErrorException(error);
        }
    }
    async uploadTransactionsToSalesforce(date: Date) {
        // Placeholder for uploading transactions to Salesforce
        const token = await authenticateSalesforce();
        const transactions = await this.TransactionModel.find({ salesforceDonation: { $exists: true } }).select(['salesforceDonation', 'transactionID', 'Stripe_Customer_ID__c']).lean();


        for (const transaction of transactions) {
            let payload;
            for (let i = 0; i < transaction.salesforceDonation.length; i++) {
                const charge = await this.retrieveStripeChargeFromSalesforce(transaction.transactionID);
                payload = {
                    Charge_Stripe_Id__c: transaction.transactionID,
                    PaymentIntent_Stripe_Id__c: transaction.Stripe_Customer_ID__c,
                    Charge_Stripe__c: charge[0].Id
                }
                await handleUpdateQuery('/services/data/v65.0/sobjects/Opportunity', '', transaction.salesforceDonation[i], payload, token);
                // Call Salesforce API to upload the transaction
                console.log('Uploading transaction to Salesforce:', payload);
                // Implement the actual API call here using token for authentication
            }
        }
    }
    async retrieveStripeChargeFromSalesforce(chargeId: string) {
        try {
            const query = `select Id, stripeGC__Stripe_Id__c from stripeGC__Charge__c where stripeGC__Stripe_Id__c = '${chargeId}' `;
            const token = await authenticateSalesforce();
            const res = await handleQuery('/services/data/v65.0/query/?q=', query, token);
            return res.records;
        } catch (error) {
            throw new InternalServerErrorException(error);
        }
    }
}
