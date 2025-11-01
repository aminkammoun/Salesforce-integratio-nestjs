import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types as MongooseTypes } from 'mongoose';
import { Donation } from '../entities/donation.entity';
import { InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { CreateDonationDto } from '../dto/create-donation.dto';
import { UpdateDonationDto } from '../dto/update-donation.dto';
import { handleInsertQuery } from 'src/config/utils';
@Injectable()
export class DonationService {
    constructor(
        @InjectModel(Donation.name) private readonly DonationModel: Model<Donation>,
    ) { }

    async create(createDonationDto: CreateDonationDto) {
        try {
            let donation = new this.DonationModel({
                ...createDonationDto,
            });
            const response = await donation.save();
            return response;
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
    findOne(id: string) {
        try {
            const donation = this.DonationModel.findById(new MongooseTypes.ObjectId(id));
            console.log('Retrieved donation:', donation);
            return donation;
        } catch (error) {
            throw new InternalServerErrorException(error);
        }
    }
    async delete(id: string) {
        try {
            const result = await this.DonationModel.findByIdAndDelete(new MongooseTypes.ObjectId(id));
            return result;
        } catch (error) {
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
    async createDonationSalesforce(createDonationDto: CreateDonationDto) {
        console.log('createDonationDto in service:', createDonationDto);
        try {
            const { donationID: id, _id : _id, ...sfPayload } = createDonationDto as any;
            console.log('Prepared Salesforce payload:', sfPayload);
            console.log('id', id);
            // Adjust the object path and body to match your Salesforce object and fields.
            const result = await handleInsertQuery('/services/data/v65.0/sobjects/', 'Opportunity/', sfPayload);
            let donation = await this.DonationModel.findOne({ donationID: createDonationDto.donationID });
            if (donation) {
                donation.salesforceID = result.salesforceId; // Simulated Salesforce ID assignment
            } else {
                throw new NotFoundException('Donation not found');
            }
            const updateDonation = await this.DonationModel.updateOne({ donationID: createDonationDto.donationID }, donation);
            console.log('donation', donation);
            console.log('updateDonation ', updateDonation);
            return donation;
        } catch (error) {
            throw new InternalServerErrorException(error);
        }
    }
}
