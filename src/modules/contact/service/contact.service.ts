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
            let contact = await this.ContactModel.findOne({ Phone: createArticleDto.Phone });

            if (contact) {
                throw new ConflictException('user with this Phone number alredy exists');
            }
            contact = new this.ContactModel({
                ...createArticleDto,
            });
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
                    return {
                        salesforceID: record.Id,
                        Name: record.Name,
                        email: record.Email,
                        Phone: record.Phone,
                    };
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
            const contact = await this.ContactModel.findOne({ phone });
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
