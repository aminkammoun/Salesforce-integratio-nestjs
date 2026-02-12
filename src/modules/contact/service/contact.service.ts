import { ConflictException, Inject, Injectable, InternalServerErrorException } from '@nestjs/common';
import { Contact } from '../entities/contact.entity';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types as MongooseTypes, set } from 'mongoose';
import { CreateContactDto } from '../dto/create-contact.dto';
import { UpdateContactDto } from '../dto/update-contact.dto';
import { authenticateSalesforce, handleInsertQuery, handleQuery } from 'src/config/utils';
import { first, last } from 'rxjs';
import { DonationService } from 'src/modules/donation/service/donation.service';
import { SponsorshipService } from 'src/modules/sponsorship/service/sponsorship.service';
import { RecurringService } from 'src/modules/recurring/service/recurring.service';
@Injectable()
export class ContactService {
    constructor(
        @InjectModel(Contact.name) private readonly ContactModel: Model<Contact>,
        @Inject() private readonly donationService: DonationService,
        @Inject() private readonly sponsorshipService: SponsorshipService,
        @Inject() private readonly recurringService: RecurringService
    ) { }

    async create(createArticleDto: CreateContactDto) {
        try {
            console.log('Creating contact with data:', createArticleDto.Phone);
            const checkExisting = await this.ContactModel.findOne({ Phone: '+1' + createArticleDto.Phone });
            if (checkExisting) {
                return checkExisting;
            }
            // Clean the phone number
            const cleanedData: any = {
                ...createArticleDto,
                Phone: '+1' + createArticleDto.Phone,
                // Set sync status based on whether this is from Salesforce
                syncedWithSalesforce: !!createArticleDto.salesforceID
            };
            // If salesforceID is empty string, remove it to avoid unique index conflicts
            if (cleanedData.salesforceID == undefined || cleanedData.salesforceID === '') {
                delete cleanedData.salesforceID;
            }


            const contact = new this.ContactModel(cleanedData);
            const response = await contact.save();
            return response;
        } catch (error) {

            throw new InternalServerErrorException(error);
        }
    }

    /* async insertFromSalesforce(query: string) {
        try {
            const res = await handleQuery('/services/data/v65.0/query/?q=', query);
            let childCollec = [];
            console.log('Service received response:', res);

            setTimeout(async () => {
                if (res) {
                    childCollec = res.records.map(record => {
                        const obj: any = {
                            firstName: record.FirstName,
                            lastName: record.LastName,
                            Name : record.Name,
                            email: record.Email,
                            Phone: record.Phone?.replace(/[^0-9]/g, '') || record.Phone,
                            syncedWithSalesforce: true,
                        };
                        if (record.Id) {
                            // Only include salesforceID when it's present and non-empty
                            obj.salesforceID = record.Id;
                        }
                        return obj;
                    });
                }
                console.log('Prepared contacts for insertion:', childCollec);

                if (childCollec.length > 0) {
                    try {
                        await this.ContactModel.insertMany(childCollec, { ordered: false });

                    } catch (error) {

                        console.error('Error inserting contacts:', error);
                    }
                }
                return childCollec;
            }, 5000);


        } catch (error) {
            throw new InternalServerErrorException(error);
        }
    } */
    async insertFromSalesforce(query: string) {
        const records = await this.fetchAllSalesforceContacts(query);
        console.log('Fetched records from Salesforce:', records);
        const operations = records.map((record: any) => ({
            updateOne: {
                filter: { salesforceID: record.Id },
                update: {
                    $set: {
                        firstName: record.FirstName,
                        lastName: record.LastName,
                        Name: record.Name,
                        email: record.Email,
                        Phone: record.MobilePhone || record.Phone,
                        syncedWithSalesforce: true,
                        salesforceID: record.Id,
                        wordpressID: record.Word_Press_Id__c || null
                    }
                },
                upsert: true
            }
        }));

        const result = await this.ContactModel.bulkWrite(operations, { ordered: false });

        console.log('Imported contacts:', result);
        return result;
    }

    async fetchAllSalesforceContacts(query: string) {
        try {
            const allRecords: any[] = [];

            // 1) First query
            let res = await handleQuery('/services/data/v65.0/query/?q=', query, await authenticateSalesforce());

            allRecords.push(...res.records);

            // 2) Fetch next records while there is a next URL
            while (!res.done) {
                console.log('Fetching next batch...');

                res = await handleQuery('', res.nextRecordsUrl, await authenticateSalesforce());
                allRecords.push(...res.records);
            }

            console.log('Total contacts retrieved:', allRecords.length);
            return allRecords;

        } catch (error) {
            console.error(error);
            throw error;
        }
    }

    async findByPhone(phone: string) {
        console.log('Finding contact by phone:', phone);
        try {
            if (!phone) {
                throw new Error('Phone number is required');
            }

            console.log('Searching for exact phone number:', phone);

            // Do an exact match search first
            const contacts = await this.ContactModel.find({ Phone: '+1' + phone });
            if (contacts.length === 0) {
                // If no exact match, try searching after cleaning the phone number

                console.log('No exact match found. Searching for cleaned phone number:');

            }
            console.log('Found contacts:', contacts);

            return contacts;
        } catch (error) {
            console.error('Error finding contacts by phone:', error);
            throw new InternalServerErrorException(error);
        }
    }

    async findByEmail(email: string) {
        try {
            const contact = await this.ContactModel.findOne({ email });
            return contact;
        } catch (error) {
            throw new InternalServerErrorException(error);
        }
    }

    async findAll() {
        try {
            const contacts = await this.ContactModel.find();
            return contacts;
        } catch (error) {
            throw new InternalServerErrorException(error);
        }
    }

    async findOne(id: string) {
        try {
            const contact = await this.ContactModel.findById(new MongooseTypes.ObjectId(id));
            return contact;
        } catch (error) {
            throw new InternalServerErrorException(error);
        }
    }

    async delete(id: string) {
        try {
            const result = await this.ContactModel.findByIdAndDelete(new MongooseTypes.ObjectId(id));
            return result;
        } catch (error) {
            throw new InternalServerErrorException(error);
        }
    }

    async update(id: string, updateContactDto: UpdateContactDto) {
        try {
            const contact = await this.ContactModel.findByIdAndUpdate(
                new MongooseTypes.ObjectId(id),
                { $set: updateContactDto },
                { new: true },
            );
            return contact;
        } catch (error) {
            throw new InternalServerErrorException(error);
        }
    }

    async updloadContactsToSalesforce() {
        try {
            const contacts = await this.ContactModel.find({ syncedWithSalesforce: false });
            console.log('Contacts to upload to Salesforce:', contacts);
            if (contacts.length === 0) {
                console.log('No contacts to upload to Salesforce');
                return [];
            }
            const token = await authenticateSalesforce();
            console.log('Using Bearer Token for upload:', token);
            const salesforcePayloads = contacts.map(async contact => {
                let payload: any
                contact.first_name = contact.Name?.split(' ')[0] || '';
                console.log(contact.Name)
                console.log(contact.Name?.split(' ')[0])
                contact.last_name = contact.Name?.split(' ').slice(1).join(' ') || '';
                console.log('Uploading contact to Salesforce:', contact);
                payload = {
                    FirstName: contact.first_name,
                    LastName: contact.last_name,
                    Email: contact.email,
                    Phone: contact.Phone?.replace(/[^0-9]/g, '') || contact.Phone,
                };

                const result = await handleInsertQuery('/services/data/v65.0/sobjects/', 'Contact/', payload, token);
                // If you want to upload immediately, perform it outside map with Promise.all.
                console.log('Salesforce upload result:', result);
                contact.salesforceID = result.salesforceId;
                contact.syncedWithSalesforce = true;
                contact.save()
                this.donationService.updateDonationByContactSalesforceId(contact._id as string, result.salesforceId).then(async (donation) => {
                    console.log('Donation found for contact during upload:', donation);
                });
                this.sponsorshipService.updateSponsorshipByContactSalesforceId(contact._id as string, result.salesforceId).then(async (sponsorship) => {
                    console.log('Sponsorship found for contact during upload:', sponsorship);
                });

                this.recurringService.updateWithContactSalesforceID(contact._id as string, result.salesforceId)
                return contact;
            })
            return salesforcePayloads;
        } catch (error) {
            console.error('Error uploading contacts to Salesforce:', error);
            throw new InternalServerErrorException(error);
        }
    }

    async getContactWithEmptyEmail() {
        try {
            const contacts = await this.ContactModel.find({ Phone: { $ne: null }, email: { $in: ["", null, undefined] } });
            console.log('Contacts with empty email:', contacts.length);
            return contacts;
        } catch (error) {
            throw new InternalServerErrorException(error);
        }
    }

    async assignEmailToContact(phone: string, email: string) {
        try {
            const contact = await this.ContactModel.findOneAndUpdate(
                { Phone: phone },
                { $set: { email: email } },
                { new: true }
            );
            return contact;
        } catch (error) {
            throw new InternalServerErrorException(error);
        }
    }

    async findByWordPressID(wordpressID: string) {
        try {
            const contact = await this.ContactModel.findOne({ wordpressID });
            return contact;
        } catch (error) {
            throw new InternalServerErrorException(error);
        }
    }
    async cleanContactPhoneNumbers() {
        try {
            const contacts = await this.ContactModel.find();
            for (const contact of contacts) {
                if (contact.Phone) {
                    console.log(`Original phone number for contact ${contact._id}: ${contact.Phone}`);

                    const cleanedPhone = '+' + contact.Phone.replace(/[^0-9]/g, '');
                    console.log(`Cleaned phone number for contact ${contact._id}: ${cleanedPhone}`);
                    if (contact.Phone !== cleanedPhone && cleanedPhone.length == 12) {
                        contact.Phone = cleanedPhone;
                        await contact.save();
                        console.log(`Cleaned phone number for contact ${contact._id}: ${cleanedPhone}`);
                    }
                }
            }
        } catch (error) {
            throw new InternalServerErrorException(error);
        }
    }
    async findcontactFromSalesforceBysfId(contactid: string) {
        try {
            const query = `Select id, Name, Email,Phone,npo02__Formula_HouseholdMailingAddress__c, npo02__FirstCloseDate__c, npo02__Best_Gift_Year__c, npo02__TotalOppAmount__c, npo02__OppAmountThisYear__c , npo02__OppAmount2YearsAgo__c, Total_Gifts_Last_12_Months__c
                  from contact 
                  where Id = '${contactid}'`;
            const token = await authenticateSalesforce();
            const res = await handleQuery('/services/data/v65.0/query/?q=', query, token);
            return res.records;
        } catch (error) {
            throw new InternalServerErrorException(error);
        }
    }
    async findcontactFromSalesforceByEmail(email: string) {
        try {
            const query = `Select id, Name, Email,Phone,npo02__Formula_HouseholdMailingAddress__c, npo02__FirstCloseDate__c, npo02__Best_Gift_Year__c, npo02__TotalOppAmount__c, npo02__OppAmountThisYear__c , npo02__OppAmount2YearsAgo__c, Total_Gifts_Last_12_Months__c
                  from contact 
                  where Email = '${email}'`;
            const token = await authenticateSalesforce();
            const res = await handleQuery('/services/data/v65.0/query/?q=', query, token);
            return res.records;
        } catch (error) {
            throw new InternalServerErrorException(error);
        }
    }
}
