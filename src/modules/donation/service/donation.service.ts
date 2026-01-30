import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types as MongooseTypes, set, Types } from 'mongoose';
import { Donation } from '../entities/donation.entity';
import { Recurring } from 'src/modules/recurring/entities/recurring.entity';
import { InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { CreateDonationDto, recordType } from '../dto/create-donation.dto';
import { UpdateDonationDto } from '../dto/update-donation.dto';
import { authenticateSalesforce, handleInsertQuery, handleQuery } from 'src/config/utils';
import { Sponsorship } from 'src/modules/sponsorship/entities/sponsorship.entity';
import { RecurringService } from 'src/modules/recurring/service/recurring.service';
import { ContactService } from 'src/modules/contact/service/contact.service';
import { ChildService } from 'src/modules/child/service/child.service';
import { SponsorshipChilds } from 'src/config/types';
import { SponsorshipService } from 'src/modules/sponsorship/service/sponsorship.service';
@Injectable()
export class DonationService {
    constructor(
        @InjectModel(Donation.name) private readonly DonationModel: Model<Donation>,
        @InjectModel(Recurring.name) private readonly RecurringModel: Model<Recurring>,
        @Inject(forwardRef(() => ContactService)) private readonly contactService: ContactService,
        @Inject(forwardRef(() => RecurringService)) private readonly recurringService: RecurringService,
        @Inject(forwardRef(() => ChildService)) private readonly ChildService: ChildService,
        @Inject(forwardRef(() => SponsorshipService)) private readonly SponsorshipService: SponsorshipService,

        //@Inject() private readonly recurringService: RecurringService,
        //@Inject() private readonly contactService: ContactService,

        //@InjectModel(Sponsorship.name) private readonly SponsorshipModel: Model<Sponsorship>,
    ) { }

    async create(createDonationDto: CreateDonationDto[]) {
        try {
            if (!createDonationDto[0].contact) {
                throw new InternalServerErrorException('Contact ID is required');
            }
            let contactDetails;
            let contact
            if (createDonationDto[0].Contact_details) {
                contactDetails = await this.contactService.create(createDonationDto[0].Contact_details);
            }
            console.log('Contact details for donation creation:', createDonationDto[0].contact);
            contact = contactDetails ? await this.contactService.findOne(contactDetails.id) : await this.contactService.findOne(createDonationDto[0].contact);
            console.log('Contact details for donation creation:', contactDetails, contact);
            const isContactSynced = contact?.syncedWithSalesforce ? true : false;
            createDonationDto = createDonationDto.map(donation => ({
                ...donation,
                contact: contact.id,
                npsp__Primary_Contact__c: isContactSynced ? contact?.salesforceID : undefined,
                //syncedWithSalesforce: isContactSynced,
            }));
            const donation = await this.DonationModel.create(createDonationDto, { ordered: false });
            return donation;
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
        donation.npe03__Recurring_Donation__c.push(salesforceId);
        console.log('Updated donation with recurring Salesforce ID:', donation);
        await donation.save();

    }


    async findOneId(id: string) {
        try {
            console.log('Finding donation by ID:', id);
            const donation = await this.DonationModel.findById(new MongooseTypes.ObjectId(id));
            console.log('Found donation:', donation);
            return donation;
        } catch (error) {
            throw new InternalServerErrorException(error);
        }
    }
    async delete(ids: string[]) {
        try {
            const objectIds = ids.map(id => new Types.ObjectId(id));

            // 1. Delete all donations
            await this.DonationModel.deleteMany({ _id: { $in: objectIds } });

            // 2. Unset donation reference in recurring
            await this.RecurringModel.updateMany(
                { donations: { $in: objectIds } },
                { $unset: { donations: "" } }   // <-- correct for ONE donation
            );

            return { deleted: ids };
        } catch (error) {
            console.error(error);
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
            const donations = await this.DonationModel.find({
                syncedWithSalesforce: false,
                Donation_Source__c: 'Fundraising App',
                StageName: "Closed Won"
            });
            if (donations.length === 0) {
                console.log('No donations to upload to Salesforce');
                return [];
            }
            const token = await authenticateSalesforce();
            console.log('donations:', donations);
            const salesforcePayloads = donations.map(async donation => {
                let payload: any
                const recurringItems = await this.recurringService.findAllBySalesforceID(donation.npe03__Recurring_Donation__c);
                donation.cartItems.map(async (item, index) => {
                    console.log('index:', index);
                    console.log('Name:', !item.Name.toLowerCase().includes('orphan'));
                    if (item.type.toLowerCase() === 'sponsorship' && !item.sfId) {
                        console.log(item.Name.toLowerCase().includes('orphan') && item.type.toLowerCase() === 'recurring', item)
                        recurringItems.forEach(async recurring => {
                            if (recurring.amount === item.amount && recurring.frequency.toLowerCase() === item.interval.toLowerCase()) {
                                payload = {
                                    Name: donation.Name,
                                    Amount: recurring?.amount,
                                    //frequency: recurring?.frequency,
                                    CloseDate: donation.CloseDate,
                                    StageName: donation.StageName,
                                    npsp__Acknowledgment_Status__c: donation.Acknowledgment_Status__c,
                                    Donation_Source__c: donation.Donation_Source__c,
                                    npsp__Primary_Contact__c: donation.npsp__Primary_Contact__c,
                                    npe03__Recurring_Donation__c: recurring.salesforceID,
                                    RecordTypeId: item.recordType,
                                    Child__c: item.Child__c,
                                };
                                item.npe03__Recurring_Donation__c = recurring.salesforceID;
                                //item.sfId = recurring.donationSf;
                                console.log('Updated cart item with Salesforce ID:', item);
                                if (!payload) {
                                    return;
                                }
                                const result = await handleInsertQuery('/services/data/v65.0/sobjects/', 'Opportunity/', payload, token);
                                if (result.salesforceId) {
                                    if (recurring) {
                                        recurring.donationSf = result.salesforceId || '';
                                        item.sfId = result.salesforceId;
                                    }

                                }
                                console.log(donation);
                                console.log(donation.cartItems);
                                await recurring.save();
                                donation.syncedWithSalesforce = true;
                                await this.update(donation._id as string, { syncedWithSalesforce: donation.syncedWithSalesforce, cartItems: donation.cartItems });
                            }
                        })
                    } else if (item.type.toLowerCase() === 'recurring' && !item.sfId) {
                        console.log('Existing recurring donation item, skipping creation:', item);
                        let createRecPay: any;
                        let createOppPay: any;
                        createRecPay = {
                            Name: item.Name,
                            npsp__RecurringType__c: 'Open',
                            npe03__Installment_Period__c: item.interval,
                            npe03__Amount__c: item.amount,
                            npe03__Contact__c: donation.npsp__Primary_Contact__c,
                            npe03__Date_Established__c: donation.CloseDate,
                            npsp__Day_of_Month__c: donation.CloseDate.getDate(),
                            npsp__Status__c: 'Active',
                        };
                        const result = await handleInsertQuery('/services/data/v65.0/sobjects/', 'npe03__Recurring_Donation__c/', createRecPay, token);
                        if (result.salesforceId) {
                            item.npe03__Recurring_Donation__c = result.salesforceId;


                            createOppPay = {
                                Name: donation.Name,
                                Amount: item.amount,
                                //frequency: recurring?.frequency,
                                CloseDate: donation.CloseDate,
                                StageName: donation.StageName,
                                npsp__Acknowledgment_Status__c: donation.Acknowledgment_Status__c,
                                Donation_Source__c: donation.Donation_Source__c,
                                npsp__Primary_Contact__c: donation.npsp__Primary_Contact__c,
                                npe03__Recurring_Donation__c: result.salesforceId,
                                RecordTypeId: item.recordType,
                                Child__c: item.Child__c,
                            }

                            const oppResult = await handleInsertQuery('/services/data/v65.0/sobjects/', 'Opportunity/', createOppPay, token);
                            if (oppResult.salesforceId) {
                                item.sfId = oppResult.salesforceId;
                            }
                            donation.syncedWithSalesforce = true;
                            await this.update(donation._id as string, { syncedWithSalesforce: donation.syncedWithSalesforce, cartItems: donation.cartItems });
                        }
                    } else if (item.type.toLowerCase() == 'one-time' && !item.sfId) {
                        // Process one-time item immediately and synchronously (no setTimeout)
                        try {
                            console.log('Processing one-time donation item:', item);
                            payload = {
                                Name: donation.Name,
                                Amount: Number(item.amount),
                                CloseDate: donation.CloseDate,
                                StageName: donation.StageName,
                                //CampaignId: "701VW00000h1twBYAQ",
                                npsp__Acknowledgment_Status__c: donation.Acknowledgment_Status__c,
                                Donation_Source__c: donation.Donation_Source__c || 'Fundraising App',
                                npsp__Primary_Contact__c: donation.npsp__Primary_Contact__c,
                                RecordTypeId: item.recordType,
                                Child__c: item.Child__c,
                            };

                            const result = await handleInsertQuery('/services/data/v65.0/sobjects/', 'Opportunity/', payload, token);
                            if (result && result.salesforceId) {
                                item.sfId = result.salesforceId;

                                // Create allocation unit if programId present
                                if (item.programId) {
                                    const allocationPayload = {
                                        Opportunity__c: result.salesforceId,
                                        Amount__c: item.amount,
                                        Program_Cohort__c: item.programId,
                                    };
                                    await handleInsertQuery('/services/data/v65.0/sobjects/', 'Program_Allocation_Unit__c/', allocationPayload, token);

                                    // Fetch GAU and create GAU allocation
                                    const queryGAU = await handleQuery('/services/data/v65.0/query/?q=', `SELECT+General_Accounting_Unit__c+FROM+pmdm__ProgramCohort__c+WHERE+id='${item.programId}'`, token);
                                    if (queryGAU?.records?.length) {
                                        const GAUPayload = {
                                            npsp__Opportunity__c: result.salesforceId,
                                            npsp__General_Accounting_Unit__c: queryGAU.records[0].General_Accounting_Unit__c,
                                            npsp__Amount__c: item.amount,
                                            npsp__Percent__c: donation.Amount ? (item.amount / donation.Amount) * 100 : 100,
                                            GAU_Type__c: 'Once',
                                        };
                                        await handleInsertQuery('/services/data/v65.0/sobjects/', 'npsp__Allocation__c/', GAUPayload, token);
                                    } else {
                                        console.warn('GAU query returned no records for programId:', item.programId);
                                    }
                                }

                                // Persist updated cart item and mark donation synced
                                donation.syncedWithSalesforce = true;
                                await this.update(donation._id as string, { syncedWithSalesforce: donation.syncedWithSalesforce, cartItems: donation.cartItems });
                            } else {
                                console.warn('Opportunity creation returned no salesforceId for donation item:', item);
                            }
                        } catch (err) {
                            console.error('Error processing one-time donation item:', err);
                        }
                    }
                })
                return donation;
            })
        } catch (error) {
            throw new InternalServerErrorException(error);
        }
    }
    async uploadOneDonationsToSalesforce(id: string) {
        try {
            const donations = await this.DonationModel.find({
                syncedWithSalesforce: false,
                _id: new MongooseTypes.ObjectId(id), // For testing specific donation
            });
            if (donations.length === 0) {
                console.log('No donations to upload to Salesforce');
                return [];
            }
            const token = await authenticateSalesforce();
            console.log('donations:', donations);
            const salesforcePayloads = donations.map(async donation => {
                let payload: any
                const recurringItems = await this.recurringService.findAllBySalesforceID(donation.npe03__Recurring_Donation__c);
                donation.cartItems.map(async (item, index) => {
                    if (item.type.toLowerCase() === 'sponsorship' && !item.sfId) {
                        recurringItems.forEach(async recurring => {
                            if (recurring.amount === item.amount && recurring.frequency.toLowerCase() === item.interval.toLowerCase()) {
                                payload = {
                                    Name: donation.Name,
                                    Amount: recurring?.amount,
                                    //frequency: recurring?.frequency,
                                    CloseDate: donation.CloseDate,
                                    StageName: donation.StageName,
                                    npsp__Acknowledgment_Status__c: donation.Acknowledgment_Status__c,
                                    Donation_Source__c: donation.Donation_Source__c,
                                    npsp__Primary_Contact__c: donation.npsp__Primary_Contact__c,
                                    npe03__Recurring_Donation__c: recurring.salesforceID,
                                    RecordTypeId: item.recordType,
                                    Child__c: item.Child__c,
                                };
                                item.npe03__Recurring_Donation__c = recurring.salesforceID;
                                //item.sfId = recurring.donationSf;
                                console.log('Updated cart item with Salesforce ID:', item);
                                if (!payload) {
                                    return;
                                }
                                const result = await handleInsertQuery('/services/data/v65.0/sobjects/', 'Opportunity/', payload, token);
                                if (result.salesforceId) {
                                    if (recurring) {
                                        recurring.donationSf = result.salesforceId || '';
                                        item.sfId = result.salesforceId;
                                    }

                                }
                                console.log(donation);
                                console.log(donation.cartItems);
                                await recurring.save();
                                donation.syncedWithSalesforce = true;
                                await this.update(donation._id as string, { syncedWithSalesforce: donation.syncedWithSalesforce, cartItems: donation.cartItems });
                            }
                        })
                    } else if (item.type.toLowerCase() === 'recurring' && !item.sfId) {
                        let createRecPay: any;
                        let createOppPay: any;
                        createRecPay = {
                            Name: item.Name,
                            npsp__RecurringType__c: 'Open',
                            npe03__Installment_Period__c: item.interval,
                            npe03__Amount__c: item.amount,
                            npe03__Contact__c: donation.npsp__Primary_Contact__c,
                            npe03__Date_Established__c: donation.CloseDate,
                            npsp__Day_of_Month__c: donation.CloseDate.getDate(),
                            npsp__Status__c: 'Active',
                        };
                        const result = await handleInsertQuery('/services/data/v65.0/sobjects/', 'npe03__Recurring_Donation__c/', createRecPay, token);
                        if (result.salesforceId) {
                            item.npe03__Recurring_Donation__c = result.salesforceId;


                            createOppPay = {
                                Name: donation.Name,
                                Amount: item.amount,
                                //frequency: recurring?.frequency,
                                CloseDate: donation.CloseDate,
                                StageName: donation.StageName,
                                npsp__Acknowledgment_Status__c: donation.Acknowledgment_Status__c,
                                Donation_Source__c: donation.Donation_Source__c,
                                npsp__Primary_Contact__c: donation.npsp__Primary_Contact__c,
                                npe03__Recurring_Donation__c: result.salesforceId,
                                RecordTypeId: item.recordType,
                                Child__c: item.Child__c,
                            }

                            const oppResult = await handleInsertQuery('/services/data/v65.0/sobjects/', 'Opportunity/', createOppPay, token);
                            if (oppResult.salesforceId) {
                                item.sfId = oppResult.salesforceId;
                            }
                            donation.syncedWithSalesforce = true;
                            await this.update(donation._id as string, { syncedWithSalesforce: donation.syncedWithSalesforce, cartItems: donation.cartItems });
                        }
                    } else if (item.type.toLowerCase() == 'one-time' && !item.sfId) {
                        // Process one-time item immediately and synchronously (no setTimeout)
                        try {
                            console.log('Processing one-time donation item:', item);
                            payload = {
                                Name: donation.Name,
                                Amount: Number(item.amount),
                                CloseDate: donation.CloseDate,
                                StageName: donation.StageName,
                                //CampaignId: "701VW00000h1twBYAQ",
                                npsp__Acknowledgment_Status__c: donation.Acknowledgment_Status__c,
                                Donation_Source__c: donation.Donation_Source__c || 'Fundraising App',
                                npsp__Primary_Contact__c: donation.npsp__Primary_Contact__c,
                                RecordTypeId: item.recordType,
                                Child__c: item.Child__c,
                            };

                            const result = await handleInsertQuery('/services/data/v65.0/sobjects/', 'Opportunity/', payload, token);
                            if (result && result.salesforceId) {
                                item.sfId = result.salesforceId;

                                // Create allocation unit if programId present
                                if (item.programId) {
                                    const allocationPayload = {
                                        Opportunity__c: result.salesforceId,
                                        Amount__c: item.amount,
                                        Program_Cohort__c: item.programId,
                                    };
                                    await handleInsertQuery('/services/data/v65.0/sobjects/', 'Program_Allocation_Unit__c/', allocationPayload, token);

                                    // Fetch GAU and create GAU allocation
                                    const queryGAU = await handleQuery('/services/data/v65.0/query/?q=', `SELECT+General_Accounting_Unit__c+FROM+pmdm__ProgramCohort__c+WHERE+id='${item.programId}'`, token);
                                    if (queryGAU?.records?.length) {
                                        const GAUPayload = {
                                            npsp__Opportunity__c: result.salesforceId,
                                            npsp__General_Accounting_Unit__c: queryGAU.records[0].General_Accounting_Unit__c,
                                            npsp__Amount__c: item.amount,
                                            npsp__Percent__c: donation.Amount ? (item.amount / donation.Amount) * 100 : 100,
                                            GAU_Type__c: 'Once',
                                        };
                                        await handleInsertQuery('/services/data/v65.0/sobjects/', 'npsp__Allocation__c/', GAUPayload, token);
                                    } else {
                                        console.warn('GAU query returned no records for programId:', item.programId);
                                    }
                                }

                                // Persist updated cart item and mark donation synced
                                donation.syncedWithSalesforce = true;
                                await this.update(donation._id as string, { syncedWithSalesforce: donation.syncedWithSalesforce, cartItems: donation.cartItems });
                            } else {
                                console.warn('Opportunity creation returned no salesforceId for donation item:', item);
                            }
                        } catch (err) {
                            console.error('Error processing one-time donation item:', err);
                        }
                    }
                })
                return donation;
            })
        } catch (error) {
            throw new InternalServerErrorException(error);
        }
    }
    async findDonationsFromSalesforceByWorksheetId(wordpressid: string) {
        try {
            const query = `SELECT 
                            Id, 
                            Name, 
                            Opportunity__r.Amount,
                            Opportunity__r.Id, 
                            Opportunity__r.Name, 
                            Opportunity__r.CloseDate, 
                            Opportunity__r.StageName, 
                            Opportunity__r.npsp__Acknowledgment_Status__c, 
                            Program_Cohort__r.Name,
                            Opportunity__r.npe03__Recurring_Donation__c, 
                            Opportunity__r.Donation_Source__c,
                            Opportunity__r.npsp__Primary_Contact__c
                            FROM Program_Allocation_Unit__c
                            WHERE Opportunity__r.npsp__Primary_Contact__c = '${wordpressid}'`;
            const token = await authenticateSalesforce();
            const res = await handleQuery('/services/data/v65.0/query/?q=', query, token);
            return res.records;
        } catch (error) {
            throw new InternalServerErrorException(error);
        }
    }
    async repaireDonations(id: string) {

        try {
            console.log('Reparing donations for id:', id);
            let donations = await this.DonationModel.find({
                syncedWithSalesforce: false,
                StageName: 'Closed Won',
                _id: new MongooseTypes.ObjectId(id)// Exclude specific donation by its ID
            });
            console.log(donations);
            //const donations = await this.DonationModel.find({ syncedWithSalesforce: false, StageName: 'Closed Won', frequency : "One-time", });
            if (!donations) {
                throw new NotFoundException('donation not found');
            }
            donations.map(async (don) => {
                if (don.frequency.toLocaleLowerCase() == "one-time") {
                    return don;
                }
                //const contact = await this.contactService.findOne(don.contact as string);
                //don.frequency = don.Amount >= 720 ? "yearly" : "monthly";
                don.cartItems = await Promise.all(don.cartItems.map(async item => {
                    let payloadSp: SponsorshipChilds[] = [];

                    if (item.amount % 60 !== 0 && item.type == "one-time") {
                        return item;
                    }
                    payloadSp = [{
                        donationId: don._id as string,
                        donorId: don.contact as string,
                        childToreserve: [
                            { nationality: don.cartItems[0].nationality || "Syrian", Requestedcount: item.amount >= 720 ? (item.amount / 720) : item.amount / 60 },
                        ],
                        frequency: item.interval,
                        Amount: item.amount,
                        donor__c: don?.npsp__Primary_Contact__c || '',
                    }]
                    const result = await this.ChildService.reserveChildren(payloadSp);
                    if (result) {
                        console.log(result);
                        this.SponsorshipService.repaireSp(result[0]._id as string);
                    }
                    return {
                        ...item,
                        interval: item.amount >= 720 ? "yearly" : "monthly",
                        type: "sponsorship",
                        nationality: item.nationality || "Syrian",
                        childrenCount: item.amount >= 720 ? (item.amount / 720) : item.amount / 60,
                    }
                }));

                await don.save();
                return don;
            })
            return donations;
        } catch (error) {
            throw new InternalServerErrorException(error);
        }
    }
}