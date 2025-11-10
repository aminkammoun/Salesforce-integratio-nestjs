import { ConflictException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { Contact } from '../entities/contact.entity';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types as MongooseTypes } from 'mongoose';
import { CreateContactDto } from '../dto/create-contact.dto';
import { UpdateContactDto } from '../dto/update-contact.dto';
import { handleQuery } from 'src/config/utils';
@Injectable()
export class ContactService {
    constructor(
        @InjectModel(Contact.name) private readonly ContactModel: Model<Contact>,
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
            if (error.code === 11000) { // MongoDB duplicate key error
                throw new ConflictException('Contact with this Salesforce ID already exists');
            }
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
                        Name: record.Name,
                        email: record.Email,
                        Phone: record.Phone?.replace(/[^0-9]/g, '') || record.Phone,
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

    async findByPhone(phone: string) {
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
