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
import { authenticateSalesforce, handleInsertQuery, handleQuery } from 'src/config/utils';
import { Child } from 'src/modules/child/entities/child.entity';
import { Donation } from 'src/modules/donation/entities/donation.entity';


@Injectable()
export class SponsorshipService {
    constructor(
        private eventEmitter: EventEmitter2,

        @InjectModel(Sponsorship.name) private readonly SponsorshipModel: Model<Sponsorship>,
        @InjectModel(Donation.name) private readonly DonationModel: Model<Donation>,
        @InjectModel(Recurring.name) private readonly RecurringModel: Model<Recurring>,
        @InjectModel(Child.name) private readonly ChildModel: Model<Child>,
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
    async findByIds(ids: string[]) {
        console.log('Finding sponsorships by IDs:', ids);
        const sponsorship = await this.SponsorshipModel.find({
            _id: { $in: ids },
            Status: "pending"
        }).exec();
        console.log('Found sponsorships:', sponsorship);
        return sponsorship
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
        const sponsorships = await this.SponsorshipModel.find({ syncedWithSalesforce: false, _id : new MongooseTypes.ObjectId('696012d40332fcf2361375da') });
        const sponsorshipDevidedChild: any[] = [];
        //const recurringCreated = await this.recurringService.createRecurring(recurring);
        if (sponsorships && sponsorships.length > 0) {
            const token = await authenticateSalesforce();
            console.log('Using Bearer Token for sponsorship upload:', token);
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
                    const result = await handleInsertQuery('/services/data/v65.0/sobjects/', 'Sponsorship__c/', payload, token);
                    sponsorship.salesforceID = result.salesforceId;
                    sponsorship.syncedWithSalesforce = true;
                    await sponsorship.save();
                }
            }


            console.log('sponsorshipDevidedChild: ', sponsorshipDevidedChild);
        }
    }
    async updateToExpired(childIds: string[]) {
        try {
            console.log('Updating sponsorships to Expired for child IDs:', typeof childIds);
            const result = await this.SponsorshipModel.updateMany(
                { child: { $in: childIds } },
                { $set: { Status: 'Expired' } }
            );
            return result;
        } catch (error) {
            throw new InternalServerErrorException(error);
        }
    }
    async checkIfChildIsSponsored(): Promise<boolean> {
        try {
            const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

            const sponsorships = await this.SponsorshipModel.find({
                Status: { $in: ['Expired', 'Active'] }, Start_Date__c: {
                    $gt: new Date("2026-01-09T00:00:00.000Z"),
                    $lt: new Date("2026-01-10T00:00:00.000Z")
                }
            }).lean(false);
            if (!sponsorships.length) return false;

            for (const sponsor of sponsorships) {
                const donation = await this.DonationModel.findById(sponsor.donation).lean();
                if (!donation || donation.StageName !== 'Closed Won') continue;

                // Fetch all children at once
                const children = await this.ChildModel.find({
                    SalesforceID: { $in: sponsor.child },
                });

                const updatedChildren: string[] = [];
                const failedReplacements: string[] = [];

                for (const child of children) {
                    if (child.Status__c === 'Sponsored') {
                        // Atomically find and update an available child to prevent race conditions
                        const availableChild = await this.ChildModel.findOneAndUpdate(
                            {
                                Status__c: 'Available',
                                NationalityList__c: child.NationalityList__c,
                            },
                            { Status__c: 'Sponsored' },
                            { new: true }
                        );

                        if (availableChild) {
                            updatedChildren.push(availableChild.SalesforceID);
                        } else {
                            // No replacement found - keep original child and track failure
                            updatedChildren.push(child.SalesforceID);
                            failedReplacements.push(child.SalesforceID);
                        }
                    }

                    if (child.Status__c === 'Available') {
                        // Atomically update available child to sponsored
                        await this.ChildModel.findOneAndUpdate(
                            { SalesforceID: child.SalesforceID },
                            { Status__c: 'Sponsored' },
                            { new: true }
                        );
                        updatedChildren.push(child.SalesforceID);
                    }
                }

                // Update sponsor with all children (including those without replacements)
                sponsor.child = updatedChildren;

                // Create recurring donation if missing
                if (!sponsor.Recurring) {
                    const recurring = await this.RecurringModel.create({
                        donorType: 'Open',
                        frequency: sponsor.frequency,
                        donations: sponsor.donation,
                        donor: sponsor.donor,
                        sponsorships: sponsor._id,
                        amount: sponsor.Amount,
                        dateEstablished: sponsor.Start_Date__c,
                        DayOfMonth: sponsor.Start_Date__c.getDate(),
                        status: 'Active',
                        synchedWithSalesforce: false,
                    });
                    // Set metadata only if some children could not be replaced
                    if (failedReplacements.length > 0) {
                        sponsor.metadata = `No available children for replacement: [${failedReplacements.join(', ')}]. Check Amount and Reserved Children`;
                    }

                    sponsor.Status = 'Active';
                    sponsor.Recurring = recurring._id as string;
                    await sponsor.save();
                }


            }

            return true;
        } catch (error) {
            throw new InternalServerErrorException(error);
        }
    }
    async findSpFromSalesforceByWordpressId(wordpressid: string) {
        try {
            const query = `SELECT Id, Child__c, Child__r.Name, Child__r.Nationality__c, Child__r.First_Name__c, Child__r.Last_Name__c,Child__r.Profile_Picture_Image__c, Status__c, Donor__c, Donor__r.Word_Press_Id__c FROM Sponsorship__c  WHERE Donor__c= '${wordpressid}'`;
            const token = await authenticateSalesforce();
            const res = await handleQuery('/services/data/v65.0/query/?q=', query, token);
            return res.records;
        } catch (error) {
            throw new InternalServerErrorException(error);
        }
    }
    async repaireSp() {
        const sponsorships = await this.SponsorshipModel.find({
            Status: "Active",
            Start_Date__c: {
                $gt: new Date("2026-01-11T23:00:00.000Z"),
                $lt: new Date("2026-01-12T00:00:00.000Z")
            }
        });
        for (const sponsorship of sponsorships) {
            const recurring = await this.RecurringModel.create({
                donorType: 'Open',
                frequency: sponsorship.frequency,
                donations: sponsorship.donation,
                donor: sponsorship.donor,
                sponsorships: sponsorship._id,
                amount: sponsorship.Amount,
                dateEstablished: sponsorship.Start_Date__c,
                DayOfMonth: sponsorship.Start_Date__c.getDate(),
                status: 'Active',
                synchedWithSalesforce: false,
            });
            sponsorship.Recurring = recurring._id as string;
            await sponsorship.save();
        }
        return sponsorships;
    }
}
