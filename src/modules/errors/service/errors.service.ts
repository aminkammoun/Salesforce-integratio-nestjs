import { Injectable } from '@nestjs/common';
import { errors } from '../entities/errors.entities';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types as MongooseTypes, set } from 'mongoose';
import { ErrorsDto } from '../dto/create-errors.dto';

@Injectable()
export class ErrorsService {
    constructor(
        @InjectModel(errors.name) private readonly ErrorsModel: Model<errors>,
    ) { }
    async logError(errorData: ErrorsDto) {
        const error = new this.ErrorsModel(errorData);
        const response = await error.save();
        return response;
    }
}
