import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types as MongooseTypes, set, Types } from 'mongoose';
import { Donation } from '../entities/donation.entity';
import { Recurring } from 'src/modules/recurring/entities/recurring.entity';
import { InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { CreateDonationDto, recordType } from '../dto/create-donation.dto';
import { UpdateDonationDto } from '../dto/update-donation.dto';
import { authenticateSalesforce, handleInsertQuery, handleQuery, handleUpdateQuery } from 'src/config/utils';
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
            const contact = await this.contactService.findOne(createDonationDto[0].contact);
            const isContactSynced = contact?.syncedWithSalesforce ? true : false;
            createDonationDto = createDonationDto.map(donation => ({
                ...donation,
                npsp__Primary_Contact__c: isContactSynced ? contact?.salesforceID : undefined,
                //syncedWithSalesforce: isContactSynced,
            }));
            const donation = await this.DonationModel.create(createDonationDto, { ordered: false });
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
                createDonationDto[0].Contact_details.Phone = createDonationDto[0].Contact_details.Phone.replace('+1', '');
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
                npsp__Primary_Contact__c: { $ne: null }
            });
            if (donations.length === 0) {
                console.log('No donations to upload to Salesforce');
                return [];
            }
            const token = await authenticateSalesforce();

            const salesforcePayloads = donations.map(async donation => {
                let payload: any
                const recurringItems = await this.recurringService.findAllBySalesforceID(donation.npe03__Recurring_Donation__c);
                donation.cartItems.map(async (item, index) => {
                    if (item.type.toLowerCase() === 'sponsorship' && !item.sfId) {
                        recurringItems.forEach(async recurring => {
                            if (recurring.amount === item.amount && recurring.frequency.toLowerCase() === item.interval.toLowerCase()) {
                                const donationUpdatePayload = {
                                    StageName: "Closed Won",
                                }
                                const donationOfRecurring = await handleQuery('/services/data/v65.0/query/?q=', `SELECT Id, StageName FROM Opportunity WHERE npe03__Recurring_Donation__c='${donation.npe03__Recurring_Donation__c[0]}' AND StageName = 'Scheduled'`, token);
                                if (donationOfRecurring?.records?.length > 0) {
                                    donationUpdatePayload.StageName = "Closed Won";
                                    await handleUpdateQuery('/services/data/v65.0/sobjects/Opportunity', '', donationOfRecurring.records[0].Id, donationUpdatePayload, token);
                                    item.sfId = donationOfRecurring.records[0].Id;
                                    recurring.donationSf = donationOfRecurring.records[0].Id;
                                    await recurring.save();
                                    donation.syncedWithSalesforce = true;
                                    await this.update(donation._id as string, { syncedWithSalesforce: true, cartItems: donation.cartItems });
                                }
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
                            npe03__Recurring_Donation_Campaign__c: donation.campaignId,
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
                                PaymentIntent_Stripe_Id__c: donation.customerStripe || donation.customerStipe,
                                Payment_Method__c: donation.transactionDetails?.payment_type,
                                Source_URL__c: donation.campaign_medium,
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
                            payload = {
                                Name: donation.Name,
                                Amount: Number(item.amount),
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
                StageName: "Closed Won",
                npsp__Primary_Contact__c: { $ne: null },
                _id: new MongooseTypes.ObjectId(id)
            });

            if (donations.length === 0) {
                console.log('No donations to upload to Salesforce');
                return [];
            }

            const token = await authenticateSalesforce();

            // 1. Loop through donations sequentially to respect API limits and Async
            for (const donation of donations) {
                let donationUpdated = false;

                // --- SEPARATION OF CONCERNS ---
                const sponsorshipItems = donation.cartItems.filter(i => i.type.toLowerCase() === 'sponsorship' && !i.sfId);
                const recurringItems = donation.cartItems.filter(i => i.type.toLowerCase() === 'recurring' && !i.sfId);
                const oneTimeItems = donation.cartItems.filter(i => i.type.toLowerCase() === 'one-time' && !i.sfId);


                // ====================================================
                // SECTION A: SPONSORSHIPS
                // ====================================================
                if (sponsorshipItems.length > 0) {
                    const recurringRecords = await this.recurringService.findAllBySalesforceID(donation.npe03__Recurring_Donation__c);

                    for (const item of sponsorshipItems) {
                        for (const recurring of recurringRecords) {
                            // Match item to recurring record based on amount/freq
                            if (recurring.amount === item.amount && recurring.frequency.toLowerCase() === item.interval.toLowerCase()) {
                                // Find the specific 'Scheduled' Opportunity for this Recurring Donation
                                const recurringId = Array.isArray(donation.npe03__Recurring_Donation__c)
                                    ? donation.npe03__Recurring_Donation__c[0]
                                    : donation.npe03__Recurring_Donation__c;

                                const query = `SELECT Id, StageName FROM Opportunity WHERE npe03__Recurring_Donation__c='${recurringId}' AND StageName = 'Scheduled'`;
                                const donationOfRecurring = await handleQuery('/services/data/v65.0/query/?q=', query, token);

                                if (donationOfRecurring?.records?.length > 0) {
                                    // Close the Opportunity
                                    const updatePayload = { StageName: "Closed Won" };
                                    await handleUpdateQuery('/services/data/v65.0/sobjects/Opportunity', '', donationOfRecurring.records[0].Id, updatePayload, token);

                                    // Update Local Data
                                    item.sfId = donationOfRecurring.records[0].Id;
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

                    // 1. Create the Recurring Donation Container object
                    const createRecPay = {
                        Name: item.Name,
                        npsp__RecurringType__c: 'Open',
                        npe03__Installment_Period__c: item.interval,
                        npe03__Amount__c: item.amount,
                        npe03__Recurring_Donation_Campaign__c: donation.campaignId,
                        npe03__Contact__c: donation.npsp__Primary_Contact__c,
                        npe03__Date_Established__c: donation.CloseDate,
                        npsp__Day_of_Month__c: new Date(donation.CloseDate).getDate(),
                        npsp__Status__c: 'Active',
                    };

                    const recResult = await handleInsertQuery('/services/data/v65.0/sobjects/', 'npe03__Recurring_Donation__c/', createRecPay, token);

                    if (recResult?.salesforceId) {
                        item.npe03__Recurring_Donation__c = recResult.salesforceId;

                        // 2. Create the First Installment Opportunity
                        const createOppPay = {
                            Name: donation.Name,
                            Amount: item.amount,
                            CloseDate: donation.CloseDate,
                            StageName: donation.StageName,
                            npsp__Acknowledgment_Status__c: donation.Acknowledgment_Status__c,
                            Donation_Source__c: donation.Donation_Source__c,
                            npsp__Primary_Contact__c: donation.npsp__Primary_Contact__c,
                            npe03__Recurring_Donation__c: recResult.salesforceId,
                            PaymentIntent_Stripe_Id__c: donation.customerStripe,
                            Payment_Method__c: donation.transactionDetails?.payment_type,
                            Source_URL__c: donation.campaign_medium,
                            RecordTypeId: item.recordType,
                            Child__c: item.Child__c,
                        };

                        const oppResult = await handleInsertQuery('/services/data/v65.0/sobjects/', 'Opportunity/', createOppPay, token);
                        if (oppResult?.salesforceId) {
                            item.sfId = oppResult.salesforceId;
                            donationUpdated = true;
                        }
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
                            // Use the record type of the first item, or a default 'Donation' record type
                            RecordTypeId: oneTimeItems[0].recordType,
                            Child__c: oneTimeItems[0].Child__c,
                        };

                        // 2. Insert Parent Opportunity
                        const result = await handleInsertQuery('/services/data/v65.0/sobjects/', 'Opportunity/', payload, token);

                        if (result?.salesforceId) {
                            const parentOppId = result.salesforceId;

                            // 3. Create Allocations for each specific item
                            for (const item of oneTimeItems) {
                                item.sfId = parentOppId; // All items share the same Opportunity ID

                                if (item.programId) {
                                    // A. Create Program Allocation Unit (Custom Object)
                                    const allocationPayload = {
                                        Opportunity__c: parentOppId,
                                        Amount__c: item.amount,
                                        Program_Cohort__c: item.programId,
                                    };
                                    await handleInsertQuery('/services/data/v65.0/sobjects/', 'Program_Allocation_Unit__c/', allocationPayload, token);

                                    // B. Create GAU Allocation (NPSP Standard)
                                    const queryGAU = await handleQuery('/services/data/v65.0/query/?q=', `SELECT General_Accounting_Unit__c FROM pmdm__ProgramCohort__c WHERE id='${item.programId}'`, token);

                                    if (queryGAU?.records?.length) {
                                        const GAUPayload = {
                                            npsp__Opportunity__c: parentOppId,
                                            npsp__General_Accounting_Unit__c: queryGAU.records[0].General_Accounting_Unit__c,
                                            npsp__Amount__c: item.amount,
                                            GAU_Type__c: 'Once',
                                        };
                                        await handleInsertQuery('/services/data/v65.0/sobjects/', 'npsp__Allocation__c/', GAUPayload, token);
                                    }
                                }
                            }
                            donationUpdated = true;
                        }
                    } catch (err) {
                        console.error(`Error processing one-time batch for donation ${donation._id}:`, err);
                    }
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
    async findDonationsFromSalesforceByWorksheetId(wordpressid: string) {
        try {
            const primaryQuery = `SELECT 
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
            let res = await handleQuery('/services/data/v65.0/query/?q=', primaryQuery, token);

            // If no Program_Allocation_Unit records found, fallback to Opportunity query
            if (!res.records || res.records.length === 0) {
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

                res = await handleQuery('/services/data/v65.0/query/?q=', fallbackQuery, token);
            }

            return res.records;
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
                            payloadSp[0].child = []; // Initialize child array if it doesn't exist
                        }
                        payloadSp[0].child.push(item.Child__c);
                    }
                    console.log('Payload for reserving children:', payloadSp);
                    // Call reserveChildren directly without setTimeout to ensure sequential execution
                    const result = await this.ChildService.reserveChildren(payloadSp);
                    if (result) {
                        await this.SponsorshipService.repaireSp(result[0]._id as string, don.campaignId || '', don.Donation_Source__c);
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
            const donation = await this.DonationModel.find({
                syncedWithSalesforce: false,
                npsp__Primary_Contact__c: null
            });
            if (!donation) {
                throw new NotFoundException('Donation not found');
            }
            donation.forEach(async (donationItem) => {
                console.log('Processing donation:', donationItem.contact.length);
                const contact = await this.contactService.findOne(donationItem.contact as string);
                if (contact && contact.salesforceID) {
                    console.log(`Updating donation ${donationItem._id} with contact Salesforce ID ${contact.salesforceID}`);
                    donationItem.npsp__Primary_Contact__c = contact.salesforceID;
                    await donationItem.save();
                }
            });
            return donation;
        } catch (error) {
            throw new InternalServerErrorException(error);
        }
    }
}