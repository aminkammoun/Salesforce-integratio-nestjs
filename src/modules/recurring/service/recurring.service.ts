import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { CreateRecurringDto } from '../dto/create-recurring.dto';
import { RecurringModule } from '../recurring.module';
import { Recurring } from '../entities/recurring.entity';
import { Model, Types as MongooseTypes } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { handleInsertQuery } from 'src/config/utils';
import { DonationService } from 'src/modules/donation/service/donation.service';
import { SponsorshipService } from 'src/modules/sponsorship/service/sponsorship.service';


@Injectable()
export class RecurringService {
    constructor(
        @Inject(forwardRef(() => DonationService)) private readonly donationService: DonationService,
        @Inject(forwardRef(() => SponsorshipService)) private readonly sponsorshipService: SponsorshipService,
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

    async uploadRecurringsToSalesforce() {
        const recurrings = await this.RecurringModel.find({ syncedWithSalesforce: false });
        if (recurrings.length === 0) {
            console.log('No donations to upload to Salesforce');
            return [];
        }
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
            const result = await handleInsertQuery('/services/data/v65.0/sobjects/', 'npe03__Recurring_Donation__c/', payload);
            console.log('Salesforce upload result for recurring:', result);
            if (result.salesforceId) {
                recurring.salesforceID = result.salesforceId;
                await recurring.save();
                await this.donationService.updateDonationWithRecurringSalesforceID(recurring.donations.toString(), result.salesforceId);
                await this.sponsorshipService.updateDonationWithRecurringSalesforceID(recurring.sponsorships.toString(), result.salesforceId);
            }

        })
        return recurrings;
    }
}
