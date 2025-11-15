import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { CreateSponsorshipDto } from '../dto/create-sponsorship';
import { Sponsorship } from '../entities/sponsorship.entity';
import { Recurring } from 'src/modules/recurring/entities/recurring.entity';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types as MongooseTypes } from 'mongoose';

@Injectable()
export class SponsorshipService {
    constructor(
        @InjectModel(Sponsorship.name) private readonly SponsorshipModel: Model<Sponsorship>,
        @InjectModel(Recurring.name) private readonly RecurringModel: Model<Recurring>,
    ) { }

    async create(createSponsorshipDto: CreateSponsorshipDto) {
        try {
            // Generate a unique sponsorship ID if not provided
            if (!createSponsorshipDto.sponsorshipID) {
                const timestamp = new Date().getTime();
                const random = Math.floor(Math.random() * 1000);
                createSponsorshipDto.sponsorshipID = `SP${timestamp}${random}`;
            }

            const sponsorship = new this.SponsorshipModel(createSponsorshipDto);
            const saved = await sponsorship.save();
            // If the sponsorship is linked to a Recurring plan, add it to the Recurring.sponsorships array
            const recurringId = (createSponsorshipDto as any).Recurring || (createSponsorshipDto as any).recurring;
            if (recurringId) {
                try {
                    await this.RecurringModel.findByIdAndUpdate(recurringId, { $addToSet: { sponsorships: saved._id } });
                } catch (err) {
                    console.error('Failed to link sponsorship to recurring:', err);
                }
            }
            return saved;
        } catch (error) {
            if (error.code === 11000 && error.keyPattern?.sponsorshipID) {
                throw new Error('Sponsorship ID already exists');
            }
            throw error;
        }
    }
    async findAll() {
        return this.SponsorshipModel.find().exec();
    }
    async delete(id: string) {
        const result = await this.SponsorshipModel.findByIdAndDelete(new MongooseTypes.ObjectId(id));
        if (result) {
            try {
                await this.RecurringModel.updateMany({ sponsorships: result._id }, { $pull: { sponsorships: result._id } });
            } catch (err) {
                console.error('Failed to remove sponsorship from recurring documents:', err);
            }
        }
        return result;
    }
    async updateToActive(sponsorshipId: string) {
        const result = await this.SponsorshipModel.updateOne(
            { _id: sponsorshipId },
            { $set: { Status: 'Active' } },
        );
        return result;
        
    }

     async updateSponsorshipByContactSalesforceId(contactId: string, ContactSalesforceID: string) {
            try {
                console.log('Searching for sponsorship with contact ID:', contactId);
                const sponsorship = await this.SponsorshipModel.find({ donor: contactId });
                if (!sponsorship) {
                    return 
                }
                sponsorship.forEach(async (sponsorshipItem) => {
                    sponsorshipItem.Donor__c = ContactSalesforceID;
                    await sponsorshipItem.save();
                    console.log('Found sponsorship for contact:', sponsorshipItem);
                }
                );
                console.log('Found sponsorship for contact:', sponsorship);
                return sponsorship;
            } catch (error) {
                throw new InternalServerErrorException(error);
            }
        }
}
