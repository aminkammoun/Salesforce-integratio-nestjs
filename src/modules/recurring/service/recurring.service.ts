import { forwardRef, Inject, Injectable, InternalServerErrorException } from '@nestjs/common';
import { CreateRecurringDto } from '../dto/create-recurring.dto';
import { RecurringModule } from '../recurring.module';
import { Recurring } from '../entities/recurring.entity';
import { Model, Types as MongooseTypes, Types } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { authenticateSalesforce, handleInsertQuery, handleQuery } from 'src/config/utils';
import { DonationService } from 'src/modules/donation/service/donation.service';
import { SponsorshipService } from 'src/modules/sponsorship/service/sponsorship.service';
import { TransactionService } from 'src/modules/transaction/service/transaction.service';


@Injectable()
export class RecurringService {
    constructor(
        @Inject(forwardRef(() => DonationService)) private readonly donationService: DonationService,
        @Inject(forwardRef(() => SponsorshipService)) private readonly sponsorshipService: SponsorshipService,
        @Inject(forwardRef(() => TransactionService)) private readonly TransactionService: TransactionService,

        @InjectModel(Recurring.name) private readonly RecurringModel: Model<Recurring>

    ) { }
    createRecurring(data: CreateRecurringDto) {
        // Logic to create a recurring payment
        console.log('Creating recurring payment with data:', data);
        return this.RecurringModel.create(data);

    }

    async updateWithDonationSalesforceID(donation: string, salesforceId: string) {
        const recurring = await this.RecurringModel.find({ donation: new MongooseTypes.ObjectId(donation), syncedWithSalesforce: false })
        recurring.forEach(async rec => {
            rec.donationSf = salesforceId;
            await rec.save();
        });
        return recurring;
    }
    async updateWithContactSalesforceID(contact: string, salesforceId: string) {
        const recurring = await this.RecurringModel.find({ donor: contact, syncedWithSalesforce: false })
        console.log('Found recurrings for contact ID:', contact, recurring);
        if (recurring.length === 0) {
            console.log('No recurrings found for contact ID:', contact);
            return [];
        }
        recurring.forEach(async rec => {
            rec.npe03__Contact__c = salesforceId;
            console.log('rec : ', rec);
            await rec.save();
        });
        return recurring;
    }
    async findOneId(id: string) {
        return this.RecurringModel.findById(id);
    }
    async uploadRecurringsToSalesforce() {
        const recurrings = await this.RecurringModel.find({ syncedWithSalesforce: false });
        if (recurrings.length === 0) {
            console.log('No donations to upload to Salesforce');
            return [];
        }
        const token = await authenticateSalesforce();
        const salesforcePayloads = recurrings.map(async recurring => {

            let payload: any
            payload = {
                Name: recurring.name,
                npsp__RecurringType__c: recurring.donorType,
                npe03__Installment_Period__c: recurring.frequency,
                npe03__Amount__c: recurring.amount,
                npe03__Contact__c: recurring.npe03__Contact__c,
                npe03__Date_Established__c: recurring.dateEstablished,
                npsp__Day_of_Month__c: recurring.DayOfMonth,
                npsp__Status__c: recurring.status,
                //RecordTypeId: donation.RecordTypeId,
            };
            const result = await handleInsertQuery('/services/data/v65.0/sobjects/', 'npe03__Recurring_Donation__c/', payload, token);
            console.log('Salesforce upload result for recurring:', result);
            if (result.salesforceId) {
                recurring.salesforceID = result.salesforceId;
                recurring.syncedWithSalesforce = true;
                await recurring.save();
                await this.donationService.updateDonationWithRecurringSalesforceID(recurring.donations.toString(), result.salesforceId);
                await this.sponsorshipService.updateDonationWithRecurringSalesforceID(recurring.sponsorships.toString(), result.salesforceId);
            }

        })
        return recurrings;
    }
    async findBySalesforceID(salesforceID: string) {
        return this.RecurringModel.findOne({ salesforceID });
    }
    async findAllBySalesforceID(salesforceID: string[]) {
        return this.RecurringModel.find({ salesforceID });
    }
    async findRecurringFromSalesforceByWordpressId(wordpressid: string) {
        try {
            const query = `SELECT Id, Name, npe03__Amount__c, npsp__Status__c, npe03__Contact__c,  npe03__Contact__r.Word_Press_Id__c FROM npe03__Recurring_Donation__c WHERE npe03__Contact__c= '${wordpressid}'`;
            const token = await authenticateSalesforce();
            const res = await handleQuery('/services/data/v65.0/query/?q=', query, token);
            return res.records;
        } catch (error) {
            throw new InternalServerErrorException(error);
        }
    }
    async findAll() {
        try {
            const recurrings = await this.RecurringModel.find({
                status: "Active",
                effectiveDate: {
                    $gt: new Date("2026-01-09T00:00:00.000Z")
                },
                customerStipe: null
            });
            return recurrings;
        } catch (error) {
            throw new InternalServerErrorException(error);
        }
    }
    async updateRecurringsWithPaymentData() {
        try {
            const recurrings = await this.RecurringModel.find({
                status: "Active",
                syncedWithSalesforce: false,
                _id: new Types.ObjectId("696012dc0332fcf2361375e0")
            });
            const transactionData = await this.TransactionService.findOne(recurrings[0].donations.toString());
            const donationData = await this.donationService.findOneId(recurrings[0].donations.toString());

            if (transactionData) {
                recurrings[0].npsp__PaymentMethod__c = transactionData.Payment__Credit_Card_Type__c;
            }
            recurrings[0].npe03__Recurring_Donation_Campaign__c = donationData?.campaignId || '';
            await recurrings[0].save();

            return recurrings;
            /*for(const recurring of recurrings) {
                // Assume we have a method to fetch payment data from Stripe
               const transactionData = await this.TransactionService.findOne(recurring.donations.toString());
               const donationData = await this.donationService.findOneId(recurring.donations.toString());
               if(!transactionData) continue;
               recurring.npsp__PaymentMethod__c = transactionData.Payment__Credit_Card_Type__c;
               recurring.npe03__Recurring_Donation_Campaign__c = donationData?.campaignId || '';
            }*/
        } catch (error) {
            throw new InternalServerErrorException(error);
        }
    }
}
