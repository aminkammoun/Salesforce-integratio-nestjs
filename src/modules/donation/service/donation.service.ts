import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types as MongooseTypes } from 'mongoose';
import { Donation } from '../entities/donation.entity';
import { Recurring } from 'src/modules/recurring/entities/recurring.entity';
import { InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { CreateDonationDto } from '../dto/create-donation.dto';
import { UpdateDonationDto } from '../dto/update-donation.dto';
import { handleInsertQuery } from 'src/config/utils';
import { Sponsorship } from 'src/modules/sponsorship/entities/sponsorship.entity';
import { RecurringService } from 'src/modules/recurring/service/recurring.service';
@Injectable()
export class DonationService {
    constructor(
        @InjectModel(Donation.name) private readonly DonationModel: Model<Donation>,
        @InjectModel(Recurring.name) private readonly RecurringModel: Model<Recurring>,
        //@Inject() private readonly recurringService: RecurringService,
        @Inject(forwardRef(() => RecurringService)) private readonly recurringService: RecurringService,

        //@InjectModel(Sponsorship.name) private readonly SponsorshipModel: Model<Sponsorship>,
    ) { }

    async create(createDonationDto: CreateDonationDto) {
        try {
            let donation = new this.DonationModel({
                ...createDonationDto,
            });
            const response = await donation.save();
            // If the donation is linked to a Recurring plan, add it to the Recurring.donations array
            const recurringId = (createDonationDto as any).Recurring || (createDonationDto as any).recurring;
            if (recurringId) {
                try {
                    await this.RecurringModel.findByIdAndUpdate(recurringId, { $addToSet: { donations: response._id } });
                } catch (err) {
                    // Non-fatal: log or swallow so donation creation still succeeds
                    console.error('Failed to link donation to recurring:', err);
                }
            }
            return response;
        } catch (error) {
            throw new InternalServerErrorException(error);
        }
    }

    async findAll() {
        try {
            const donations = await this.DonationModel.find();
            console.log('Retrieved donations:', donations);
            return donations;
        } catch (error) {
            throw new InternalServerErrorException(error);
        }
    }
    async findDonationBySalesforceID(contactId: string) {
        try {
            console.log('Searching for donation with contact ID:', contactId);
            const donation = await this.DonationModel.findOne({ contact: contactId, StageName: 'Pendding' });
            console.log('Found donation for contact:', donation);
            return donation;
        } catch (error) {
            throw new InternalServerErrorException(error);
        }
    }

    async updateDonationByContactSalesforceId(contactId: string, ContactSalesforceID: string) {
        try {
            console.log('Searching for donation with contact ID:', contactId);
            const donation = await this.DonationModel.find({ contact: contactId, syncedWithSalesforce: false });
            if (!donation) {
                throw new NotFoundException('Donation not found for the given contact ID');
            }
            donation.forEach(async (donationItem) => {
                if (!donationItem.npsp__Primary_Contact__c) {

                    donationItem.npsp__Primary_Contact__c = ContactSalesforceID;

                    await donationItem.save();
                    console.log('Updated donation for contact:', donationItem);
                };
            });



            return donation;
        } catch (error) {
            throw new InternalServerErrorException(error);
        }

    }

    async updateDonationWithRecurringSalesforceID(id: string, salesforceId: string) {
        const donation = await this.findOneId(id)
        if (!donation) {
            throw new NotFoundException('donation does not exists related to recurring');
        }
        donation.npe03__Recurring_Donation__c = salesforceId;
        console.log('Updated donation with recurring Salesforce ID:', donation);
        await donation.save();

    }


    findOneId(id: string) {
        try {
            const donation = this.DonationModel.findById(new MongooseTypes.ObjectId(id));
            return donation;
        } catch (error) {
            throw new InternalServerErrorException(error);
        }
    }
    async delete(id: string) {
        try {
            const result = await this.DonationModel.findByIdAndDelete(new MongooseTypes.ObjectId(id));
            if (result) {
                // Remove this donation id from any Recurring documents that reference it
                try {
                    await this.RecurringModel.updateMany({ donations: result._id }, { $pull: { donations: result._id } });
                } catch (err) {
                    console.error('Failed to remove donation from recurring documents:', err);
                }
            }
            return result;
        } catch (error) {
            throw new InternalServerErrorException(error);
        }
    }
    async update(id: string, updatedonationDto: UpdateDonationDto) {
        try {
            const donation = await this.DonationModel.findByIdAndUpdate(
                new MongooseTypes.ObjectId(id),
                { $set: updatedonationDto },
                { new: true },
            );
            if (!donation) {
                throw new NotFoundException('donation does not exists');
            }

            await donation.save();
            return donation;
        } catch (error) {
            throw new InternalServerErrorException(error);
        }
    }

    async uploadDonationsToSalesforce() {
        try {
            const donations = await this.DonationModel.find({ syncedWithSalesforce: false });
            if (donations.length === 0) {
                console.log('No donations to upload to Salesforce');
                return [];
            }
            const salesforcePayloads = donations.map(async donation => {
                let payload: any
                payload = {
                    Name: donation.Name,
                    Amount: donation.Amount,
                    CloseDate: donation.CloseDate,
                    StageName: donation.StageName,
                    npsp__Acknowledgment_Status__c: donation.Acknowledgment_Status__c,
                    Donation_Source__c: donation.Donation_Source__c,
                    npsp__Primary_Contact__c: donation.npsp__Primary_Contact__c,
                    npe03__Recurring_Donation__c : donation.npe03__Recurring_Donation__c,
                    //RecordTypeId: donation.RecordTypeId,
                };
                const result = await handleInsertQuery('/services/data/v65.0/sobjects/', 'Opportunity/', payload);
                // If you want to upload immediately, perform it outside map with Promise.all.
                console.log('Salesforce upload result:', result);
                donation.salesforceID = result.salesforceId;
                donation.syncedWithSalesforce = true;
                donation.save()
                this.recurringService.updateWithDonationSalesforceID(donation._id as string, result.salesforceId)
                return donation;
            })
            return salesforcePayloads;
        } catch (error) {
            throw new InternalServerErrorException(error);
        }
    }
}
