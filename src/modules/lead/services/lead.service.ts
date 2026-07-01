import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Lead } from '../entities/lead.entity';
import { Model, Types as MongooseTypes, set } from 'mongoose';
import { leadCreateLeadDto } from 'src/modules/lead/dto/create-lead.dto';

@Injectable()
export class LeadService {
    constructor(
        @InjectModel(Lead.name) private readonly LeadModel: Model<Lead>,
    ) { }
    async createLead(leadData: leadCreateLeadDto) {
        try {
            const lead = new this.LeadModel(leadData);
            const response = await lead.save();

            return response;
        } catch (error) {
            throw new InternalServerErrorException(error);
        }

    }
    async getNumberOfLeads(event_id: string) {
        try {
            const count = await this.LeadModel.countDocuments({ event_id });
            return { "leads_captured ": count };
        } catch (error) {
            throw new InternalServerErrorException(error);
        }
    }
}