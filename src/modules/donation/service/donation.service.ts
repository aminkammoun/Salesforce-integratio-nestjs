import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types as MongooseTypes, Types } from 'mongoose';
import { Donation } from '../entities/donation.entity';
import { Recurring } from 'src/modules/recurring/entities/recurring.entity';
import { InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { CreateDonationDto } from '../dto/create-donation.dto';
import { UpdateDonationDto } from '../dto/update-donation.dto';
import { handleInsertQuery, handleQuery } from 'src/config/utils';
import { Sponsorship } from 'src/modules/sponsorship/entities/sponsorship.entity';
import { RecurringService } from 'src/modules/recurring/service/recurring.service';
import { ContactService } from 'src/modules/contact/service/contact.service';
@Injectable()
export class DonationService {
    constructor(
        @InjectModel(Donation.name) private readonly DonationModel: Model<Donation>,
        @InjectModel(Recurring.name) private readonly RecurringModel: Model<Recurring>,
        @Inject(forwardRef(() => ContactService)) private readonly contactService: ContactService,
        @Inject(forwardRef(() => RecurringService)) private readonly recurringService: RecurringService,
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
            //const response = await donation.save();
            // If the donation is linked to a Recurring plan, add it to the Recurring.donations array

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


    findOneId(id: string) {
        try {
            const donation = this.DonationModel.findById(new MongooseTypes.ObjectId(id));
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
            const donations = await this.DonationModel.find({ syncedWithSalesforce: false });
            if (donations.length === 0) {
                console.log('No donations to upload to Salesforce');
                return [];
            }
            const salesforcePayloads = donations.map(async donation => {
                let payload: any
                const recurringItems = await this.recurringService.findAllBySalesforceID(donation.npe03__Recurring_Donation__c);
                donation.cartItems.map(async (item, index) => {
                    console.log('index:', index);
                    console.log('index:', !item.Name.toLowerCase().includes('orphan'));
                    if (item.Name.toLowerCase().includes('orphan') && item.type.toLowerCase() === 'recurring' && !item.sfId) {
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
                                    //RecordTypeId: donation.RecordTypeId,
                                };
                                item.npe03__Recurring_Donation__c = recurring.salesforceID;
                                //item.sfId = recurring.donationSf;
                                console.log('Updated cart item with Salesforce ID:', item);
                                if (!payload) {
                                    return;
                                }
                                const result = await handleInsertQuery('/services/data/v65.0/sobjects/', 'Opportunity/', payload);
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
                    } else if (!item.Name.toLowerCase().includes('orphan') && item.type.toLowerCase() === 'recurring' && !item.sfId) {
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
                            //RecordTypeId: donation.RecordTypeId,
                        };
                        const result = await handleInsertQuery('/services/data/v65.0/sobjects/', 'npe03__Recurring_Donation__c/', createRecPay);
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
                            }

                            const oppResult = await handleInsertQuery('/services/data/v65.0/sobjects/', 'Opportunity/', createOppPay);
                            if (oppResult.salesforceId) {
                                item.sfId = oppResult.salesforceId;
                            }
                            donation.syncedWithSalesforce = true;
                            await this.update(donation._id as string, { syncedWithSalesforce: donation.syncedWithSalesforce, cartItems: donation.cartItems });
                        }
                    } else if (item.type.toLowerCase() === 'onetime' && !item.sfId) {
                        console.log('One-time donation item, skipping creation:', item);
                        payload = {
                            Name: donation.Name,
                            Amount: <Number>item.amount,
                            //frequency: recurring?.frequency,
                            CloseDate: donation.CloseDate,
                            StageName: donation.StageName,
                            npsp__Acknowledgment_Status__c: donation.Acknowledgment_Status__c,
                            Donation_Source__c: "Fundraising App",
                            npsp__Primary_Contact__c: donation.npsp__Primary_Contact__c,
                            //npe03__Recurring_Donation__c: recurring.salesforceID,
                            //RecordTypeId: donation.RecordTypeId,
                        };
                        //item.npe03__Recurring_Donation__c = recurring.salesforceID;
                        //item.sfId = recurring.donationSf;
                        console.log('Updated cart item with Salesforce ID:', item);
                        if (!payload) {
                            return;
                        }
                        const result = await handleInsertQuery('/services/data/v65.0/sobjects/', 'Opportunity/', payload);
                        if (result.salesforceId) {
                            item.sfId = result.salesforceId;
                            const allocationPayload = {
                                Opportunity__c: result.salesforceId,
                                Amount__c: item.amount,
                                Program_Cohort__c: item.programId,
                            }
                            const allocationResult = await handleInsertQuery('/services/data/v65.0/sobjects/', 'Program_Allocation_Unit__c/', allocationPayload);

                            const queryGAU = await handleQuery('/services/data/v65.0/query/?q=', `SELECT+General_Accounting_Unit__c+FROM+pmdm__ProgramCohort__c+WHERE+id ='${item.programId}'`);
                            console.log('General Accounting Unit Query Result:', queryGAU);
                            //select Id,Name,npsp__Amount__c,npsp__Percent__c,npsp__General_Accounting_Unit__c,npsp__Opportunity__c from npsp__Allocation__c
                            const GAUPayload = {
                                npsp__Opportunity__c: result.salesforceId,
                                npsp__General_Accounting_Unit__c: queryGAU.records[0].General_Accounting_Unit__c,
                                npsp__Amount__c: item.amount,
                                npsp__Percent__c: donation.Amount ? (item.amount / donation.Amount) * 100 : 100,
                                GAU_Type__c: 'Once'
                            }
                            const GAUResult = await handleInsertQuery('/services/data/v65.0/sobjects/', 'npsp__Allocation__c/', GAUPayload);

                        }
                        console.log(donation);
                        console.log(donation.cartItems);
                        donation.syncedWithSalesforce = true;
                        await this.update(donation._id as string, { syncedWithSalesforce: donation.syncedWithSalesforce, cartItems: donation.cartItems });
                    }


                })


                return donation;
                /*donation.npe03__Recurring_Donation__c.forEach(async item => {
                    const recurring = await this.recurringService.findBySalesforceID(item);
        
                    payload = {
                        Name: donation.Name,
                        Amount: recurring?.amount,
                        //frequency: recurring?.frequency,
                        CloseDate: donation.CloseDate,
                        StageName: donation.StageName,
                        npsp__Acknowledgment_Status__c: donation.Acknowledgment_Status__c,
                        Donation_Source__c: donation.Donation_Source__c,
                        npsp__Primary_Contact__c: donation.npsp__Primary_Contact__c,
                        npe03__Recurring_Donation__c: item,
                        //RecordTypeId: donation.RecordTypeId,
                    };
                    console.log('Prepared payload for Salesforce:', payload);
                    const result = await handleInsertQuery('/services/data/v65.0/sobjects/', 'Opportunity/', payload);
                    // If you want to upload immediately, perform it outside map with Promise.all.
                    console.log('Salesforce upload result:', result);
                    if (result.salesforceId) {
                        if (recurring) {
                            recurring.donationSf = result.salesforceId || '';
                        }
                        donation.syncedWithSalesforce = true;
                        await donation.save();
                    }
                    //donation.salesforceID = result.salesforceId;
                    //donation.syncedWithSalesforce = true;
                    //donation.save()
                })
                //return payload;
                //this.recurringService.updateWithDonationSalesforceID(donation._id as string, result.salesforceId)
                return donation;*/
            })

            //return salesforcePayloads;
        } catch (error) {
            throw new InternalServerErrorException(error);
        }
    }
}
