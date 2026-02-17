import { Injectable } from '@nestjs/common';
import { Log } from '../entities/log.entity';
import { Model, Types as MongooseTypes, set, Types } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
@Injectable()
export class LogService {
    constructor(
        @InjectModel(Log.name) private readonly logModel: Model<Log>,

    ) { }
    async createlog(name: string, status: string, date) {
        // Here you would typically save the log to a database or an external logging service
        const log = new this.logModel({
            name,
            date,
            status
        });
        await log.save();
    }
}
