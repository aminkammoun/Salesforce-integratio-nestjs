import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { CreateSponsorshipDto } from '../dto/create-sponsorship';
import { Sponsorship } from '../entities/sponsorship.entity';
import { Recurring } from 'src/modules/recurring/entities/recurring.entity';
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { Model, Types as MongooseTypes } from 'mongoose';
import { SponsorshipCreatedListener } from '../listeners/sponsorship-created.listener';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { SponsorshipCreatedEvent } from '../events/sponsprship-created.events';
import { UpdateSponsorshipDto } from '../dto/update-sponsorship';
import { handleInsertQuery } from 'src/config/utils';


@Injectable()
export class SponsorshipService {
    constructor(
        private eventEmitter: EventEmitter2,

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
            // Emit an event that a sponsorship has been created
            const sponsorshipCreatedEvent = new SponsorshipCreatedEvent();
            sponsorshipCreatedEvent.sponsorshipID = saved.sponsorshipID;
            sponsorshipCreatedEvent.donation = saved.donation;
            sponsorshipCreatedEvent.donor = saved.donor;
            sponsorshipCreatedEvent.child = saved.child;
            sponsorshipCreatedEvent.Status = saved.Status;
            sponsorshipCreatedEvent.Donor__c = saved.Donor__c;
            sponsorshipCreatedEvent.Start_Date__c = saved.Start_Date__c;
            sponsorshipCreatedEvent.Recurring = saved.Recurring;
            console.log('Emitting sponsorship.created event for sponsorship ID:', saved._id);
            sponsorshipCreatedEvent.id = saved._id as string;
            this.eventEmitter.emit('sponsorship.created', sponsorshipCreatedEvent);


            return saved;
        } catch (error) {
            if (error.code === 11000 && error.keyPattern?.sponsorshipID) {
                throw new Error('Sponsorship ID already exists');
            }
            throw error;
        }
    }

    async createMany(createSponsorshipDto: CreateSponsorshipDto[]) {
        try {
            return await this.SponsorshipModel.insertMany(createSponsorshipDto);
        } catch (error) {
            throw error;
        }
    }
    async findAll() {
        return this.SponsorshipModel.find().exec();
    }
    async findById(id: string) {
        const sponsorship = await this.SponsorshipModel.findById(new MongooseTypes.ObjectId(id)).exec();
        if (!sponsorship) {
            throw new NotFoundException(`Sponsorship with ID ${id} not found`);
        }
        return sponsorship;
    }
    async updateDonationWithRecurringSalesforceID(id: string, salesforceId: string) {
        const sponsorship = await this.findById(id)
        if (!sponsorship) {
            throw new NotFoundException('sponsorship does not exists related to recurring');
        }
        sponsorship.Current_Recurring_Donation__c = salesforceId;
        console.log('Updated sponsorship with recurring Salesforce ID:', sponsorship);
        await sponsorship.save();

    }
    async update(id: string, updateSponsorshipDto: UpdateSponsorshipDto[]) {
        const sponsorship = await this.SponsorshipModel.findByIdAndUpdate(
            new MongooseTypes.ObjectId(id),
            { $set: updateSponsorshipDto },
            { new: true },
        ).exec();
        if (!sponsorship) {
            throw new NotFoundException(`Sponsorship with ID ${id} not found`);
        }
        return sponsorship;
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

        const sponsorshipCreatedEvent = new SponsorshipCreatedEvent();
        if (result.modifiedCount === 1) {
            sponsorshipCreatedEvent.id = sponsorshipId;
        }

        this.eventEmitter.emit('sponsorship.updated', sponsorshipCreatedEvent);

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
                if (!sponsorshipItem.Donor__c) {
                    sponsorshipItem.Donor__c = ContactSalesforceID;
                    await sponsorshipItem.save();
                    console.log('Found sponsorship for contact:', sponsorshipItem);
                }
            }
            );
            console.log('Found sponsorship for contact:', sponsorship);
            return sponsorship;
        } catch (error) {
            throw new InternalServerErrorException(error);
        }
    }

    async uploadSponsorshipsToSalesforce() {
        const sponsorships = await this.SponsorshipModel.find({ syncedWithSalesforce: false });
        const sponsorshipDevidedChild: any[] = [];
        //const recurringCreated = await this.recurringService.createRecurring(recurring);
        if (sponsorships && sponsorships.length > 0) {
            for (const sponsorship of sponsorships) {
                for (const child of sponsorship.child) {
                    const timestamp = new Date().getTime();
                    const random = Math.floor(Math.random() * 1000);

                    /* sponsorshipDevidedChild.push({
                        sponsorshipID: `SP${timestamp}${random}`,
                        child: child,


                        Status: sponsorship.Status,
                        Donor__c: sponsorship.Donor__c,
                        Start_Date__c: sponsorship.Start_Date__c,
                        Current_Recurring_Donation__c: sponsorship.Current_Recurring_Donation__c,
                    }) */
                    let payload: any
                    payload = {
                        //sponsorshipID: `SP${timestamp}${random}`,
                        Child__c: child,
                        Status__c: sponsorship.Status,
                        Donor__c: sponsorship.Donor__c,
                        Start_Date__c: sponsorship.Start_Date__c,
                        Current_Recurring_Donation__c: sponsorship.Current_Recurring_Donation__c,
                    };
                    const result = await handleInsertQuery('/services/data/v65.0/sobjects/', 'Sponsorship__c/', payload);
                    sponsorship.salesforceID = result.salesforceId;
                    sponsorship.syncedWithSalesforce = true;
                    await sponsorship.save();
                }
            }

           
            console.log('sponsorshipDevidedChild: ', sponsorshipDevidedChild);
        }
    }
}
