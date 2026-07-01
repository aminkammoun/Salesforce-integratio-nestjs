import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types as MongooseTypes, set, Types } from 'mongoose';
import { Donation } from '../entities/donation.entity';
import { Recurring } from 'src/modules/recurring/entities/recurring.entity';
import { InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { CreateDonationDto, Frequency, recordType, Territory } from '../dto/create-donation.dto';
import { UpdateDonationDto } from '../dto/update-donation.dto';
import { authenticateSalesforce, authenticateSalesforceCA, authenticateSalesforceUK, handleInsertQuery, handleQuery, handleUpdateQuery } from 'src/config/utils';
import { Sponsorship } from 'src/modules/sponsorship/entities/sponsorship.entity';
import { RecurringService } from 'src/modules/recurring/service/recurring.service';
import { ContactService } from 'src/modules/contact/service/contact.service';
import { ChildService } from 'src/modules/child/service/child.service';
import { SponsorshipChilds } from 'src/config/types';
import { SponsorshipService } from 'src/modules/sponsorship/service/sponsorship.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
@Injectable()
export class DonationService {
    constructor(
        @InjectModel(Donation.name) private readonly DonationModel: Model<Donation>,
        @InjectModel(Recurring.name) private readonly RecurringModel: Model<Recurring>,
        @Inject(forwardRef(() => ContactService)) private readonly contactService: ContactService,
        @Inject(forwardRef(() => RecurringService)) private readonly recurringService: RecurringService,
        @Inject(forwardRef(() => ChildService)) private readonly ChildService: ChildService,
        @Inject(forwardRef(() => SponsorshipService)) private readonly SponsorshipService: SponsorshipService,
        private readonly eventEmitter: EventEmitter2,

        //@Inject() private readonly recurringService: RecurringService,
        //@Inject() private readonly contactService: ContactService,

        //@InjectModel(Sponsorship.name) private readonly SponsorshipModel: Model<Sponsorship>,
    ) { }

    async create(createDonationDto: CreateDonationDto[]) {
        try {
            if (!createDonationDto[0].contact) {
                throw new InternalServerErrorException('Contact ID is required');
            }
            const contact = await this.contactService.findOne(createDonationDto[0].contact);
            const isContactSynced = contact?.syncedWithSalesforce ? true : false;
            createDonationDto = createDonationDto.map(donation => ({
                ...donation,
                npsp__Primary_Contact__c: isContactSynced ? contact?.salesforceID : undefined,
                //syncedWithSalesforce: isContactSynced,
            }));
            const donation = await this.DonationModel.create(createDonationDto, { ordered: false });
            /*for (const d of donation) {
                console.log('Emitting donation.created event for donation:', d);
                const payload = {
                    _id: String(d._id),
                    StageName: d.StageName,
                    Donation_Source__c: d.Donation_Source__c,
                    contact: d.contact,
                    createdAt: d.createdDate,
                }
                this.eventEmitter.emit('donation.created', payload);
            }*/
            return donation;
        } catch (error) {
            throw new InternalServerErrorException(error);
        }
    }
    async createWebDonation(createDonationDto: CreateDonationDto[]) {
        try {
            if (!createDonationDto[0].contact) {
                throw new InternalServerErrorException('Contact ID is required');
            }
            let contactDetails;
            let contact
            if (createDonationDto[0].Contact_details) {
                if (createDonationDto[0].Contact_details.Phone.includes('+1')) {
                    createDonationDto[0].Contact_details.Phone = createDonationDto[0].Contact_details.Phone.replace('+1', '');
                }
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
            /*for (const d of donation) {
                console.log('Emitting donation.created event for donation:', d);
                const payload = {
                    _id: String(d._id),
                    StageName: d.StageName,
                    Donation_Source__c: d.Donation_Source__c,
                    contact: d.contact,
                    createdAt: d.createdDate,
                };
                this.eventEmitter.emit('donation.created', payload);
            }*/
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
            const donation = await this.DonationModel.find({ contact: contactId });
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
        //donation.syncedWithSalesforce = true
        console.log('Updated donation with recurring Salesforce ID:', donation);
        await donation.save();

    }


    async findOneId(id: string) {
        try {
            const donation = await this.DonationModel.findById(new MongooseTypes.ObjectId(id));
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




    async update(id: string, updatedonationDto: UpdateDonationDto, synchedAt?: Date) {
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
                StageName: "Closed Won",
                npsp__Primary_Contact__c: { $ne: null },
            });

            if (donations.length === 0) {
                console.log('No donations to upload to Salesforce');
                return [];
            }

            const token = await authenticateSalesforce();

            for (const donation of donations) {
                let donationUpdated = false;

                const sponsorshipItems = donation.cartItems.filter(i => i.type.toLowerCase() === 'sponsorship' && !i.sfId);
                const recurringItems = donation.cartItems.filter(i => i.type.toLowerCase() === 'recurring' && !i.sfId);
                const oneTimeItems = donation.cartItems.filter(i => i.type.toLowerCase() === 'one-time' && !i.sfId && i.recordType != "0128W000000GRMwQAO");
                const oneTimeGift = donation.cartItems.filter(i => i.type.toLowerCase() === 'one-time' && !i.sfId && i.recordType == "0128W000000GRMwQAO");

                console.log(`Processing donation ${donation._id} with ${sponsorshipItems.length} sponsorship items, ${recurringItems.length} recurring items, and ${oneTimeItems.length} one-time items.`);

                // ====================================================
                // SECTION A: SPONSORSHIPS
                // ====================================================
                if (sponsorshipItems.length > 0) {
                    const recurringRecords = await this.recurringService.findAllBySalesforceID(donation.npe03__Recurring_Donation__c);

                    for (const [index, item] of sponsorshipItems.entries()) {
                        for (const recurring of recurringRecords) {
                            if (recurring.amount === item.amount && recurring.frequency.toLowerCase() === item.interval.toLowerCase()) {
                                console.log('dkhal l sponsorships')
                                const recurringId = Array.isArray(donation.npe03__Recurring_Donation__c)
                                    ? donation.npe03__Recurring_Donation__c[index]
                                    : donation.npe03__Recurring_Donation__c;

                                const query = `SELECT Id, StageName FROM Opportunity WHERE npe03__Recurring_Donation__c='${recurringId}' AND StageName = 'Scheduled'`;
                                const donationOfRecurring = await handleQuery('/services/data/v65.0/query/?q=', query, token);
                                console.log('donationOfRecurring', donationOfRecurring);
                                if (donationOfRecurring?.records?.length > 0) {
                                    const updatePayload = {
                                        StageName: "Closed Won",
                                        Charge_Stripe_Id__c: donation.transactionDetails?.charge_id,
                                        PaymentIntent_Stripe_Id__c: donation.transactionDetails?.intent_id,
                                        Payment_Method__c: donation.transactionDetails?.payment_type,
                                        Source_URL__c: donation.campaign_medium,
                                        campaignId: donation.campaignId,
                                        UTM_Medium__c: donation.campaignId,
                                        campaign_source__c: donation.campaign_source,

                                    };
                                    await handleUpdateQuery('/services/data/v65.0/sobjects/Opportunity', '', donationOfRecurring.records[0].Id, updatePayload, token);
                                    item.sfId = donationOfRecurring.records[0].Id;
                                    if (item.programId && item.sfId) {
                                        const allocationPayload = {
                                            Opportunity__c: item.sfId,
                                            Amount__c: item.amount,
                                            Program_Cohort__c: item.programId,
                                        };
                                        await handleInsertQuery('/services/data/v65.0/sobjects/', 'Program_Allocation_Unit__c/', allocationPayload, token);

                                    }
                                    recurring.donationSf = donationOfRecurring.records[0].Id;
                                    await recurring.save();
                                    donationUpdated = true;
                                }
                            }
                        }
                    }
                }


                // ====================================================
                // SECTION B: RECURRING (NEW)
                // ====================================================
                for (const item of recurringItems) {
                    console.log('Creating new recurring donation structure:', item);
                    const createRecPay = {
                        Name: item.Name,
                        npsp__RecurringType__c: 'Open',
                        npe03__Installment_Period__c: item.interval,
                        npe03__Amount__c: item.amount,
                        npe03__Recurring_Donation_Campaign__c: donation.campaignId,
                        npe03__Contact__c: donation.npsp__Primary_Contact__c,
                        Stripe_Customer__c: donation.customerStripe || donation.customerStipe,
                        npe03__Date_Established__c: donation.createdDate,
                        npsp__Day_of_Month__c: new Date(donation.createdDate).getDate(),
                        npsp__Status__c: 'Active',
                    };

                    const recResult = await handleInsertQuery('/services/data/v65.0/sobjects/', 'npe03__Recurring_Donation__c/', createRecPay, token);

                    if (recResult?.salesforceId) {
                        const query = `SELECT Id, StageName FROM Opportunity WHERE npe03__Recurring_Donation__c='${recResult.salesforceId}' AND StageName = 'Scheduled'`;
                        const donationOfRecurring = await handleQuery('/services/data/v65.0/query/?q=', query, token);

                        if (donationOfRecurring?.records?.length > 0) {
                            const updatePayload = {
                                StageName: "Closed Won",
                                Charge_Stripe_Id__c: donation.transactionDetails?.charge_id,
                                PaymentIntent_Stripe_Id__c: donation.transactionDetails?.intent_id,
                                Payment_Method__c: donation.transactionDetails?.payment_type,
                                Source_URL__c: donation.campaign_medium,
                                campaign_source__c: donation.campaign_source,
                                UTM_Medium__c: donation.campaignId,

                            };
                            await handleUpdateQuery('/services/data/v65.0/sobjects/Opportunity', '', donationOfRecurring.records[0].Id, updatePayload, token);
                            item.sfId = donationOfRecurring.records[0].Id;
                            item.npe03__Recurring_Donation__c = recResult.salesforceId;

                            if (item.sfId && item.npe03__Recurring_Donation__c) {
                                if (item.programId) {
                                    await this.assignProgramCohortToDonation(item.sfId, item.programId, item.amount, token);
                                    const queryGAU = await handleQuery('/services/data/v65.0/query/?q=', `SELECT General_Accounting_Unit__c FROM pmdm__ProgramCohort__c WHERE id='${item.programId}'`, token);

                                    if (queryGAU?.records?.length) {
                                        this.assignGAUToDonation(item.sfId, item.programId, item.amount, token);
                                    }
                                }
                            }
                            donationUpdated = true;
                        }


                    }
                }
                // ====================================================
                // SECTION C: ONE-TIME (AGGREGATED)
                // ====================================================
                if (oneTimeItems.length > 0) {
                    try {
                        const totalAmount = oneTimeItems.reduce((sum, i) => sum + Number(i.amount), 0);

                        const payload = {
                            Name: donation.Name,
                            Amount: totalAmount,
                            CloseDate: donation.createdDate,
                            StageName: donation.StageName,
                            CampaignId: donation.campaignId,
                            npsp__Acknowledgment_Status__c: donation.Acknowledgment_Status__c,
                            Donation_Source__c: donation.Donation_Source__c || 'Fundraising App',
                            npsp__Primary_Contact__c: donation.npsp__Primary_Contact__c,
                            Charge_Stripe_Id__c: donation.transactionDetails?.charge_id,
                            PaymentIntent_Stripe_Id__c: donation.transactionDetails?.intent_id,
                            Payment_Method__c: donation.transactionDetails?.payment_type,
                            Source_URL__c: donation.campaign_medium,
                            campaign_source__c: donation.campaign_source,
                            UTM_Medium__c: donation.campaignId,
                            npsp__Honoree_Name__c: oneTimeItems[0].on_behalf_of || null,
                            RecordTypeId: oneTimeItems[0].recordType,
                            Child__c: oneTimeItems[0].Child__c,
                        };

                        const result = await handleInsertQuery('/services/data/v65.0/sobjects/', 'Opportunity/', payload, token);

                        if (result?.salesforceId) {
                            const parentOppId = result.salesforceId;

                            for (const item of oneTimeItems) {
                                item.sfId = parentOppId;

                                if (item.programId) {
                                    await this.assignProgramCohortToDonation(parentOppId, item.programId, item.amount, token);
                                    /*const queryGAU = await handleQuery('/services/data/v65.0/query/?q=', `SELECT General_Accounting_Unit__c FROM pmdm__ProgramCohort__c WHERE id='${item.programId}'`, token);

                                    if (queryGAU?.records?.length) {
                                        this.assignGAUToDonation(parentOppId, item.programId, item.amount, token);
                                    }*/
                                }
                            }
                            donationUpdated = true;
                        }
                    } catch (err) {
                        console.error(`Error processing one-time batch for donation ${donation._id}:`, err);
                    }
                }
                if (oneTimeGift.length > 0) {
                    for (const item of oneTimeGift) {
                        try {
                            const payload = {
                                Name: item.Name,
                                Amount: item.amount,
                                CloseDate: donation.createdDate,
                                StageName: donation.StageName,
                                CampaignId: donation.campaignId,
                                npsp__Acknowledgment_Status__c: donation.Acknowledgment_Status__c,
                                Donation_Source__c: donation.Donation_Source__c || 'Fundraising App',
                                npsp__Primary_Contact__c: donation.npsp__Primary_Contact__c,
                                Charge_Stripe_Id__c: donation.transactionDetails?.charge_id,
                                PaymentIntent_Stripe_Id__c: donation.transactionDetails?.intent_id,
                                Payment_Method__c: donation.transactionDetails?.payment_type,
                                Source_URL__c: donation.campaign_medium,
                                campaign_source__c: donation.campaign_source,
                                UTM_Medium__c: donation.campaignId,
                                npsp__Honoree_Name__c: item.on_behalf_of || null,
                                RecordTypeId: item.recordType,
                                Child__c: item.Child__c,
                            };

                            const result = await handleInsertQuery('/services/data/v65.0/sobjects/', 'Opportunity/', payload, token);

                            if (result?.salesforceId) {
                                item.sfId = result.salesforceId;

                                if (item.programId) {
                                    await this.assignProgramCohortToDonation(result.salesforceId, item.programId, item.amount, token);
                                }
                            }
                        } catch (err) {
                            console.error(`Error processing one-time gift for donation ${donation._id}:`, err);
                        }
                    }
                    donationUpdated = true;

                }
                // ====================================================
                // FINAL SAVE
                // ====================================================
                if (donationUpdated) {
                    const allSynced = donation.cartItems.every(i => !!i.sfId);

                    await this.DonationModel.updateOne(
                        { _id: donation._id },
                        {
                            $set: {
                                syncedWithSalesforce: allSynced,
                                cartItems: donation.cartItems
                            }
                        }
                    );
                }
            }

            return { success: true };

        } catch (error) {
            throw new InternalServerErrorException(error);
        }
    }

    async uploadOneDonationsToSalesforce(id: string) {
        try {
            const donations = await this.DonationModel.find({
                syncedWithSalesforce: false,
                StageName: "Closed Won",
                npsp__Primary_Contact__c: { $ne: null },
                _id: new MongooseTypes.ObjectId(id)
            });

            if (donations.length === 0) {
                console.log('No donations to upload to Salesforce');
                return [];
            }

            let token: '';
            // 1. Loop through donations sequentially to respect API limits and Async
            for (const donation of donations) {
                if (donation.Territory__c === Territory.US || donation.Territory__c === null) {

                    token = await authenticateSalesforce();
                } else if (donation.Territory__c === Territory.UK) {
                    token = await authenticateSalesforceUK();
                } else if (donation.Territory__c === Territory.CA) {
                    token = await authenticateSalesforceCA();
                } else {
                    token = await authenticateSalesforce();

                }
                let donationUpdated = false;

                // --- SEPARATION OF CONCERNS ---
                const sponsorshipItems = donation.cartItems.filter(i => i.type.toLowerCase() === 'sponsorship' && !i.sfId);
                const recurringItems = donation.cartItems.filter(i => i.type.toLowerCase() === 'recurring' && !i.sfId);
                const oneTimeItems = donation.cartItems.filter(i => i.type.toLowerCase() === 'one-time' && !i.sfId);
                const oneTimeGift = donation.cartItems.filter(i => i.type.toLowerCase() === 'one-time' && !i.sfId && i.recordType == "0128W000000GRMwQAO");

                console.log(`Processing donation ${donation._id} with ${sponsorshipItems.length} sponsorship items, ${recurringItems.length} recurring items, and ${oneTimeItems.length} one-time items.`);

                // ====================================================
                // SECTION A: SPONSORSHIPS
                // ====================================================
                if (sponsorshipItems.length > 0) {
                    const recurringRecords = await this.recurringService.findAllBySalesforceID(donation.npe03__Recurring_Donation__c);

                    for (const [index, item] of sponsorshipItems.entries()) {
                        for (const recurring of recurringRecords) {
                            if (recurring.amount === item.amount && recurring.frequency.toLowerCase() === item.interval.toLowerCase()) {
                                console.log('dkhal l sponsorships')
                                console.log((index))
                                const recurringId = Array.isArray(donation.npe03__Recurring_Donation__c)
                                    ? donation.npe03__Recurring_Donation__c[index]
                                    : donation.npe03__Recurring_Donation__c;
                                console.log(recurringId)
                                const query = `SELECT Id, StageName FROM Opportunity WHERE npe03__Recurring_Donation__c='${recurringId}' AND StageName = 'Scheduled'`;
                                const donationOfRecurring = await handleQuery('/services/data/v65.0/query/?q=', query, token);
                                if (donationOfRecurring?.records?.length > 0) {
                                    // Close the Opportunity
                                    const updatePayload = {
                                        StageName: "Closed Won",
                                        Charge_Stripe_Id__c: donation.transactionDetails?.charge_id,
                                        PaymentIntent_Stripe_Id__c: donation.transactionDetails?.intent_id,
                                        Payment_Method__c: donation.transactionDetails?.payment_type,
                                        Source_URL__c: donation.campaign_medium,
                                        campaignId: donation.campaignId,
                                        UTM_Medium__c: donation.campaignId,
                                        campaign_source__c: donation.campaign_source,

                                    };
                                    await handleUpdateQuery('/services/data/v65.0/sobjects/Opportunity', '', donationOfRecurring.records[0].Id, updatePayload, token);

                                    // Update Local Data
                                    item.sfId = donationOfRecurring.records[0].Id;
                                    if (item.programId && item.sfId) {
                                        const allocationPayload = {
                                            Opportunity__c: item.sfId,
                                            Amount__c: item.amount,
                                            Program_Cohort__c: item.programId,
                                        };
                                        await handleInsertQuery('/services/data/v65.0/sobjects/', 'Program_Allocation_Unit__c/', allocationPayload, token);

                                    }
                                    recurring.donationSf = donationOfRecurring.records[0].Id;
                                    await recurring.save();
                                    donationUpdated = true;
                                }
                            }
                        }
                    }
                }


                // ====================================================
                // SECTION B: RECURRING (NEW)
                // ====================================================
                for (const item of recurringItems) {
                    console.log('Creating new recurring donation structure:', item);
                    const createRecPay = {
                        Name: item.Name,
                        npsp__RecurringType__c: 'Open',
                        npe03__Installment_Period__c: item.interval,
                        npe03__Amount__c: item.amount,
                        npe03__Recurring_Donation_Campaign__c: donation.campaignId,
                        npe03__Contact__c: donation.npsp__Primary_Contact__c,
                        Stripe_Customer__c: donation.customerStripe || donation.customerStipe,
                        npe03__Date_Established__c: donation.CloseDate,
                        npsp__Day_of_Month__c: new Date(donation.CloseDate).getDate(),
                        npsp__Status__c: 'Active',
                    };

                    const recResult = await handleInsertQuery('/services/data/v65.0/sobjects/', 'npe03__Recurring_Donation__c/', createRecPay, token);

                    if (recResult?.salesforceId) {
                        const query = `SELECT Id, StageName FROM Opportunity WHERE npe03__Recurring_Donation__c='${recResult.salesforceId}' AND (StageName = 'Pledged' OR StageName = 'Scheduled')`;
                        const donationOfRecurring = await handleQuery('/services/data/v65.0/query/?q=', query, token);
                        item.npe03__Recurring_Donation__c = recResult.salesforceId;
                        if (donationOfRecurring?.records?.length > 0) {
                            const updatePayload = {
                                StageName: "Closed Won",
                                Charge_Stripe_Id__c: donation.transactionDetails?.charge_id,
                                PaymentIntent_Stripe_Id__c: donation.transactionDetails?.intent_id,
                                Payment_Method__c: donation.transactionDetails?.payment_type,
                                Source_URL__c: donation.campaign_medium,
                                campaign_source__c: donation.campaign_source,
                                UTM_Medium__c: donation.campaignId,

                            };
                            await handleUpdateQuery('/services/data/v65.0/sobjects/Opportunity', '', donationOfRecurring.records[0].Id, updatePayload, token);
                            item.sfId = donationOfRecurring.records[0].Id;
                            item.npe03__Recurring_Donation__c = recResult.salesforceId;
                            console.log('Updating recurring donation:', item);
                            if (item.sfId && item.npe03__Recurring_Donation__c) {
                                if (item.programId) {
                                    await this.assignProgramCohortToDonation(item.sfId, item.programId, item.amount, token);
                                    const queryGAU = await handleQuery('/services/data/v65.0/query/?q=', `SELECT General_Accounting_Unit__c FROM pmdm__ProgramCohort__c WHERE id='${item.programId}'`, token);

                                    if (queryGAU?.records?.length) {
                                        this.assignGAUToDonation(item.sfId, item.programId, item.amount, token);
                                    }
                                }
                            }
                            donationUpdated = true;
                        }

                        // item.npe03__Recurring_Donation__c = recResult.salesforceId;

                        // // 2. Create the First Installment Opportunity
                        // const createOppPay = {
                        //     Name: donation.Name,
                        //     Amount: item.amount,
                        //     CloseDate: donation.CloseDate,
                        //     StageName: donation.StageName,
                        //     npsp__Acknowledgment_Status__c: donation.Acknowledgment_Status__c,
                        //     Donation_Source__c: donation.Donation_Source__c,
                        //     npsp__Primary_Contact__c: donation.npsp__Primary_Contact__c,
                        //     npe03__Recurring_Donation__c: recResult.salesforceId,
                        //     PaymentIntent_Stripe_Id__c: donation.customerStripe,
                        //     Payment_Method__c: donation.transactionDetails?.payment_type,
                        //     Source_URL__c: donation.campaign_medium,
                        //     RecordTypeId: item.recordType,
                        //     Child__c: item.Child__c,
                        // };

                        // const oppResult = await handleInsertQuery('/services/data/v65.0/sobjects/', 'Opportunity/', createOppPay, token);
                        // if (oppResult?.salesforceId) {
                        //     item.sfId = oppResult.salesforceId;
                        //     donationUpdated = true;
                        // }
                    }
                }


                // ====================================================
                // SECTION C: ONE-TIME (AGGREGATED)
                // ====================================================
                if (oneTimeItems.length > 0) {
                    try {
                        // 1. Aggregate: Sum amounts for the Parent Opportunity
                        const totalAmount = oneTimeItems.reduce((sum, i) => sum + Number(i.amount), 0);

                        const payload = {
                            Name: donation.Name,
                            Amount: totalAmount, // TOTAL of all one-time items
                            CloseDate: donation.CloseDate,
                            StageName: donation.StageName,
                            CampaignId: donation.campaignId,
                            npsp__Acknowledgment_Status__c: donation.Acknowledgment_Status__c,
                            Donation_Source__c: donation.Donation_Source__c || 'Fundraising App',
                            npsp__Primary_Contact__c: donation.npsp__Primary_Contact__c,
                            Charge_Stripe_Id__c: donation.transactionDetails?.charge_id,
                            PaymentIntent_Stripe_Id__c: donation.transactionDetails?.intent_id,
                            Payment_Method__c: donation.transactionDetails?.payment_type,
                            Source_URL__c: donation.campaign_medium,
                            campaign_source__c: donation.campaign_source,
                            UTM_Medium__c: donation.campaignId,
                            npsp__Honoree_Name__c: oneTimeItems[0].on_behalf_of || null,
                            // Use the record type of the first item, or a default 'Donation' record type
                            RecordTypeId: oneTimeItems[0].recordType,
                            Child__c: oneTimeItems[0].Child__c,
                            Territory__c: donation.Territory__c
                        };

                        // 2. Insert Parent Opportunity
                        const result = await handleInsertQuery('/services/data/v65.0/sobjects/', 'Opportunity/', payload, token);
                        if (result) {
                            console.log(result);
                        }
                        console.log('tesst')
                        console.log(donationUpdated)
                        if (result?.salesforceId) {
                            const parentOppId = result.salesforceId;
                            console.log(parentOppId)
                            console.log(result)
                            // 3. Create Allocations for each specific item
                            for (const item of oneTimeItems) {
                                item.sfId = parentOppId; // All items share the same Opportunity ID

                                if (item.programId) {
                                    await this.assignProgramCohortToDonation(parentOppId, item.programId, item.amount, token);
                                    // B. Create GAU Allocation (NPSP Standard)
                                    /*const queryGAU = await handleQuery('/services/data/v65.0/query/?q=', `SELECT General_Accounting_Unit__c FROM pmdm__ProgramCohort__c WHERE id='${item.programId}'`, token);
                    
                                    if (queryGAU?.records?.length) {
                                        this.assignGAUToDonation(parentOppId, item.programId, item.amount, token);
                                    }*/
                                }
                            }
                            donationUpdated = true;
                        }
                    } catch (err) {
                        console.error(`Error processing one-time batch for donation ${donation._id}:`, err);
                    }
                }

                if (oneTimeGift.length > 0) {
                    for (const item of oneTimeGift) {
                        try {
                            const payload = {
                                Name: item.Name,
                                Amount: item.amount,
                                CloseDate: donation.createdDate,
                                StageName: donation.StageName,
                                CampaignId: donation.campaignId,
                                npsp__Acknowledgment_Status__c: donation.Acknowledgment_Status__c,
                                Donation_Source__c: donation.Donation_Source__c || 'Fundraising App',
                                npsp__Primary_Contact__c: donation.npsp__Primary_Contact__c,
                                Charge_Stripe_Id__c: donation.transactionDetails?.charge_id,
                                PaymentIntent_Stripe_Id__c: donation.transactionDetails?.intent_id,
                                Payment_Method__c: donation.transactionDetails?.payment_type,
                                Source_URL__c: donation.campaign_medium,
                                campaign_source__c: donation.campaign_source,
                                UTM_Medium__c: donation.campaignId,
                                npsp__Honoree_Name__c: item.on_behalf_of || null,
                                RecordTypeId: item.recordType,
                                Child__c: item.Child__c,
                                Territory__c: donation.Territory__c
                            };

                            const result = await handleInsertQuery('/services/data/v65.0/sobjects/', 'Opportunity/', payload, token);

                            if (result?.salesforceId) {
                                item.sfId = result.salesforceId;

                                if (item.programId) {
                                    await this.assignProgramCohortToDonation(result.salesforceId, item.programId, item.amount, token);
                                }
                            }
                        } catch (err) {
                            console.error(`Error processing one-time gift for donation ${donation._id}:`, err);
                        }
                    }
                    donationUpdated = true;

                }
                // ====================================================
                // FINAL SAVE
                // ====================================================
                if (donationUpdated) {
                    // Check if all items are now synced to determine global status
                    const allSynced = donation.cartItems.every(i => !!i.sfId);

                    await this.DonationModel.updateOne(
                        { _id: donation._id },
                        {
                            $set: {
                                syncedWithSalesforce: allSynced,
                                cartItems: donation.cartItems
                            }
                        }
                    );
                }
            } // End of Donation Loop

            return { success: true };

        } catch (error) {
            throw new InternalServerErrorException(error);
        }
    }
    async assignProgramCohortToDonation(donationId: string, programCohortId: string, amount: number, token: string) {
        try {
            const allocationPayload = {
                Opportunity__c: donationId,
                Amount__c: amount,
                Program_Cohort__c: programCohortId,
            };
            await handleInsertQuery('/services/data/v65.0/sobjects/', 'Program_Allocation_Unit__c/', allocationPayload, token);

        } catch (error) {
            throw new InternalServerErrorException(error);
        }
    }
    async assignGAUToDonation(donationId: string, programId: string, amount: number, token: string) {
        try {
            const queryGAU = await handleQuery('/services/data/v65.0/query/?q=', `SELECT General_Accounting_Unit__c FROM pmdm__ProgramCohort__c WHERE id='${programId}'`, token);

            if (queryGAU?.records?.length) {
                const GAUPayload = {
                    npsp__Opportunity__c: donationId,
                    npsp__General_Accounting_Unit__c: queryGAU.records[0].General_Accounting_Unit__c,
                    npsp__Amount__c: amount,
                    GAU_Type__c: 'Once',
                };
                await handleInsertQuery('/services/data/v65.0/sobjects/', 'npsp__Allocation__c/', GAUPayload, token);
            }

        } catch (error) {
            throw new InternalServerErrorException(error);
        }

    }
    async assignGAUToRecurring(recurringId: string, programId: string, amount: number, token: string) {
        try {
            const queryGAU = await handleQuery('/services/data/v65.0/query/?q=', `SELECT General_Accounting_Unit__c FROM pmdm__ProgramCohort__c WHERE id='${programId}'`, token);

            if (queryGAU?.records?.length) {
                const GAUPayload = {
                    npsp__Opportunity__c: recurringId,
                    npsp__General_Accounting_Unit__c: queryGAU.records[0].General_Accounting_Unit__c,
                    npsp__Amount__c: amount,
                    GAU_Type__c: 'Once',
                };
                await handleInsertQuery('/services/data/v65.0/sobjects/', 'npsp__Allocation__c/', GAUPayload, token);
            }

        } catch (error) {
            throw new InternalServerErrorException(error);
        }

    }
    async findDonationsFromSalesforceByWorksheetId(wordpressid: string) {
        let donations: any[] = [];
        try {
            const primaryQuery = `SELECT 
            Id, 
            Name, 
            Amount__c,
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

            const fallbackQuery = `SELECT 
            Id, 
            Amount,
            Name, 
            CloseDate, 
            StageName, 
            npsp__Acknowledgment_Status__c, 
            npe03__Recurring_Donation__c, 
            Donation_Source__c,
            npsp__Primary_Contact__c
            FROM Opportunity
            WHERE npsp__Primary_Contact__c = '${wordpressid}'`;

            const token = await authenticateSalesforce();

            const primaryQueryRes = await handleQuery('/services/data/v65.0/query/?q=', primaryQuery, token);
            const secondQueryRes = await handleQuery('/services/data/v65.0/query/?q=', fallbackQuery, token);

            if (primaryQueryRes?.records?.length > 0) {
                donations.push(...primaryQueryRes.records);
            }

            if (secondQueryRes?.records?.length > 0) {
                donations.push(...secondQueryRes.records);
            }

            if (donations.length === 0) {
                throw new NotFoundException('No donations found for this contact in Salesforce');
            }

            return donations;
        } catch (error) {
            throw new InternalServerErrorException(error);
        }
    }
    async repaireDonations(donationsource: string) {

        try {
            let donations = await this.DonationModel.find({
                syncedWithSalesforce: false,
                StageName: 'Closed Won',
                Donation_Source__c: donationsource,
                frequency: { $regex: "^(?!one-time$)", $options: "i" },
                isRepaired: false,
                npsp__Primary_Contact__c: { $ne: null },
            });
            //const donations = await this.DonationModel.find({ syncedWithSalesforce: false, StageName: 'Closed Won', frequency : "One-time", });
            if (!donations) {
                throw new NotFoundException('donation not found');
            }
            for (const don of donations) {
                if (don.frequency.toLocaleLowerCase() == "one-time") {
                    continue;
                }
                //const contact = await this.contactService.findOne(don.contact as string);
                //don.frequency = don.Amount >= 720 ? "yearly" : "monthly";
                don.cartItems = await Promise.all(don.cartItems.map(async item => {
                    let payloadSp: SponsorshipChilds[] = [];
                    if (item.type.toLowerCase() == "one-time" || item.type.toLowerCase() == "recurring") {
                        return item;
                    }
                    payloadSp = [{
                        donationId: don._id as string,
                        donorId: don.contact as string,
                        childToreserve: [
                            { nationality: item.nationality || "Syrian", Requestedcount: item.amount >= 720 ? (item.amount / 720) : item.amount / 60 },
                        ],
                        frequency: item.interval,
                        Amount: item.amount,
                        donor__c: don?.npsp__Primary_Contact__c || '',
                        campaignId: don.campaignId,
                    }]
                    if (don.Donation_Source__c == 'Website' && item.Child__c) {
                        console.log('Adding existing child to payloadSp:', item.Child__c);
                        if (!payloadSp[0].child) {
                            payloadSp[0].child = [];
                        }
                        payloadSp[0].child.push(item.Child__c);
                    }
                    console.log('Payload for reserving children:', payloadSp);
                    const result = await this.ChildService.reserveChildren(payloadSp);
                    if (result) {
                        await this.SponsorshipService.repaireSp(result[0]._id as string, don.campaignId || '', don.Donation_Source__c, item.nationality || "Syrian");
                    }

                    return {
                        ...item,
                        interval: item.amount >= 720 ? "yearly" : "monthly",
                        type: "sponsorship",
                        nationality: item.nationality || "Syrian",
                        childrenCount: item.amount >= 720 ? (item.amount / 720) : item.amount / 60,
                    }
                }));
                don.isRepaired = true
                await don.save();
            }
            return donations;
        } catch (error) {
            throw new InternalServerErrorException(error);
        }
    }

    async repaireOneDonations(donationsource: string, id: string) {

        try {
            let donations = await this.DonationModel.find({
                syncedWithSalesforce: false,
                StageName: 'Closed Won',
                Donation_Source__c: donationsource,
                npsp__Primary_Contact__c: { $ne: null },
                _id: new MongooseTypes.ObjectId(id)
            });
            //const donations = await this.DonationModel.find({ syncedWithSalesforce: false, StageName: 'Closed Won', frequency : "One-time", });
            if (!donations) {
                throw new NotFoundException('donation not found');
            }
            for (const don of donations) {
                if (don.frequency.toLocaleLowerCase() == "one-time") {
                    continue;
                }
                //const contact = await this.contactService.findOne(don.contact as string);
                //don.frequency = don.Amount >= 720 ? "yearly" : "monthly";
                don.cartItems = await Promise.all(don.cartItems.map(async item => {
                    let payloadSp: SponsorshipChilds[] = [];
                    if (item.type.toLowerCase() == "one-time" || item.type.toLowerCase() == "recurring") {
                        return item;
                    }
                    payloadSp = [{
                        donationId: don._id as string,
                        donorId: don.contact as string,
                        childToreserve: [
                            { nationality: item.nationality || "Syrian", Requestedcount: item.amount >= 720 ? (item.amount / 720) : item.amount / 60 },
                        ],
                        frequency: item.interval,
                        Amount: item.amount,
                        donor__c: don?.npsp__Primary_Contact__c || '',
                        campaignId: don.campaignId,
                        Territory__c: don.Territory__c
                    }]
                    if (don.Donation_Source__c == 'Website' && item.Child__c) {
                        console.log('Adding existing child to payloadSp:', item.Child__c);
                        if (!payloadSp[0].child) {
                            payloadSp[0].child = [];
                        }
                        payloadSp[0].child.push(item.Child__c);
                    }
                    console.log('Payload for reserving children:', payloadSp);
                    const result = await this.ChildService.reserveChildren(payloadSp);
                    if (result) {
                        await this.SponsorshipService.repaireSp(result[0]._id as string, don.campaignId || '', don.Donation_Source__c, item.nationality || "Syrian", don.Territory__c as any);
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
            }
            return donations;
        } catch (error) {
            throw new InternalServerErrorException(error);
        }
    }
    async updateDonationWithnpsPrimaryContact() {
        try {
            const donations = await this.DonationModel.find({
                syncedWithSalesforce: false,
                npsp__Primary_Contact__c: null,
                Donation_Source__c: 'Fundraising App',
                StageName: "Closed Won"
            });
            console.log('Donations to update:', donations.length);
            if (!donations || donations.length === 0) {
                throw new NotFoundException('Donation not found');
            }
            for (const donationItem of donations) {
                const cnt = await this.contactService.findOne(donationItem.contact as string);
                if (cnt?.email) {
                    console.log('Processing donation with name:', donationItem.Name);
                    const getContactFromSF = await handleQuery('/services/data/v65.0/query/?q=', `SELECT Id, Name FROM Contact WHERE Email = '${cnt?.email}'`, await authenticateSalesforce());
                    // Search for contact by name in the contact model
                    //const contact = await this.contactService.findByWordPressID(donationItem.Contact_details.wordpressID?.toString() ?? '');
                    if (getContactFromSF?.records?.length > 0) {
                        //console.log(`Updating donation ${donationItem._id} with contact Salesforce ID ${getContactFromSF.records[0].Id}`);
                        donationItem.npsp__Primary_Contact__c = getContactFromSF.records[0].Id;
                        cnt.salesforceID = getContactFromSF.records[0].Id;
                        //contact.Phone = '+1' + donationItem.Contact_details.Phone.replace('+1', '');
                        cnt.syncedWithSalesforce = true;
                        await cnt.save();
                        await donationItem.save();
                    } else {
                        console.log(`No contact found for donation ${donationItem._id} with name ${donationItem.Name}`);
                    }
                }

            }
            return donations;
        } catch (error) {
            throw new InternalServerErrorException(error);
        }
    }
    async getDonationContactDetails(donationId: string) {
        try {
            const donation = await this.DonationModel.findById(donationId);
            if (!donation) {
                throw new NotFoundException('Donation not found');
            }
            if (!donation.npsp__Primary_Contact__c) {
                throw new NotFoundException('No contact associated with this donation');
            }

            const contact = await this.contactService.findBySfId(donation.npsp__Primary_Contact__c);

            if (!contact) {
                throw new NotFoundException('Contact not found in local database');
            }
            const response = {
                firstName: contact.Name?.split(' ')[0] || '',
                lastName: contact.Name?.split(' ').slice(1).join(' ') || '',
                email: contact.email,
                Amount: donation.Amount,
                Frequency: donation.frequency,
                CloseDate: donation.CloseDate,
                programName: donation.cartItems[0]?.Name || '',
            }
            return response;
        } catch (error) {
            throw new InternalServerErrorException(error);
        }
    }
    async getTotalCampaignValueWonDonation(campaignId: string) {
        const donations = await this.DonationModel.find({ campaignId: campaignId, StageName: "Closed Won", Donation_Source__c: 'Fundraising App' });
        const totalAmount = donations.reduce((sum, donation) => sum + (donation.Amount || 0), 0);

        //const yearlyCount = donations.filter(d => d.frequency?.toLowerCase() === 'yearly').length;
        const yearlyTotal = donations
            .filter(d => d.frequency?.toLowerCase() === 'yearly')
            .reduce((sum, donation) => sum + (donation.Amount || 0), 0);
        //const monthlyCount = donations.filter(d => d.frequency?.toLowerCase() === 'monthly').length;
        const monthlyTotal = donations
            .filter(d => d.frequency?.toLowerCase() === 'monthly')
            .reduce((sum, donation) => sum + (donation.Amount || 0), 0);
        const spsDonations = donations.filter(d => d.cartItems.some(item => item.type?.includes('sponsorship')));

        const totalchildrenSponsored = spsDonations.reduce((sum, donation) => {
            const childrenCount = donation.cartItems.reduce((itemSum, item) => itemSum + (item.Requestedcount || 0), 0);
            return sum + childrenCount;
        }, 0);

        const programTotals: { [key: string]: { monthly: { count: number; amount: number }; yearly: { count: number; amount: number }; oneTime: { count: number; amount: number } } } = {};

        donations.forEach(donation => {
            donation.cartItems.forEach(item => {
                const programName = item.Name || 'Unknown';
                const amount = item.amount || 0;
                const frequency = item.interval?.toLowerCase() || donation.frequency?.toLowerCase() || 'one-time';

                if (!programTotals[programName]) {
                    programTotals[programName] = {
                        monthly: { count: 0, amount: 0 },
                        yearly: { count: 0, amount: 0 },
                        oneTime: { count: 0, amount: 0 }
                    };
                }

                if (frequency === 'monthly') {
                    programTotals[programName].monthly.count++;
                    programTotals[programName].monthly.amount += amount;
                } else if (frequency === 'yearly') {
                    programTotals[programName].yearly.count++;
                    programTotals[programName].yearly.amount += amount;
                } else {
                    programTotals[programName].oneTime.count++;
                    programTotals[programName].oneTime.amount += amount;
                }
            });
        });


        return {
            numberOfDonations: donations.length,
            totalAmount,
            onetimeAmount: totalAmount - yearlyTotal - monthlyTotal,
            totalChildrenSponsored: totalchildrenSponsored,
            "Programs": {
                programTotals,

            }


        };
    }
    async enterCash(campaignId: string, amount: number) {
        const token = await authenticateSalesforce();
        console.log(token)
        const updatePayload = { Cash_Collected__c: amount };
        const result = await handleUpdateQuery('/services/data/v65.0/sobjects/Campaign', '', campaignId, updatePayload, token);
        return result;
    }
}