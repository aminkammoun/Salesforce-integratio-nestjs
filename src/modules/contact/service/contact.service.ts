import { ConflictException, Inject, Injectable, InternalServerErrorException } from '@nestjs/common';
import { Contact } from '../entities/contact.entity';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types as MongooseTypes, set } from 'mongoose';
import { CreateContactDto } from '../dto/create-contact.dto';
import { UpdateContactDto } from '../dto/update-contact.dto';
import { handleInsertQuery, handleQuery } from 'src/config/utils';
import { first, last } from 'rxjs';
import { DonationService } from 'src/modules/donation/service/donation.service';
import { SponsorshipService } from 'src/modules/sponsorship/service/sponsorship.service';
@Injectable()
export class ContactService {
    constructor(
        @InjectModel(Contact.name) private readonly ContactModel: Model<Contact>,
        @Inject() private readonly donationService: DonationService,
        @Inject() private readonly sponsorshipService: SponsorshipService
    ) { }

    async create(createArticleDto: CreateContactDto) {
        try {
            // Clean the phone number
            const cleanedData: any = {
                ...createArticleDto,
                Phone: createArticleDto.Phone?.replace(/[^0-9]/g, '') || createArticleDto.Phone,
                // Set sync status based on whether this is from Salesforce
                syncedWithSalesforce: !!createArticleDto.salesforceID
            };
            console.log('Creating contact with data:', createArticleDto.salesforceID);
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

    async insertFromSalesforce(query: string) {
        try {
            const res = await handleQuery('/services/data/v65.0/query/?q=', query);
            let childCollec = [];
            console.log('Service received response:', res);
            if (res.done == true) {
                childCollec = res.records.map(record => {
                    const obj: any = {
                        firstName: record.FirstName,
                        lastName: record.LastName,
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

            if (childCollec.length > 0) {
                try {
                    await this.ContactModel.insertMany(childCollec, { ordered: false });

                } catch (error) {

                    console.error('Error inserting contacts:', error);
                }
            }
            return childCollec;


        } catch (error) {
            throw new InternalServerErrorException(error);
        }
    }

    async updloadContactsToSalesforce() {
        try {
            const contacts = await this.ContactModel.find({ syncedWithSalesforce: false });
            if (contacts.length === 0) {
                console.log('No contacts to upload to Salesforce');
                return [];
            }
            const salesforcePayloads = contacts.map(async contact => {
                let payload: any

                payload = {

                    FirstName: contact.first_name,
                    lastName: contact.last_name,
                    Email: contact.email,
                    Phone: contact.Phone?.replace(/[^0-9]/g, '') || contact.Phone,
                };

                const result = await handleInsertQuery('/services/data/v65.0/sobjects/', 'Contact/', payload);
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
                return contact;
            })




            return salesforcePayloads;
        } catch (error) {
            console.error('Error uploading contacts to Salesforce:', error);
            throw new InternalServerErrorException(error);
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
            const contacts = await this.ContactModel.find({ Phone: phone });
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
}
