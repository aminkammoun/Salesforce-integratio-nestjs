import { Injectable } from '@nestjs/common';
import { CreateRecurringDto } from '../dto/create-recurring.dto';
import { RecurringModule } from '../recurring.module';
import { Recurring } from '../entities/recurring.entity';
import { Model, Types as MongooseTypes } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';


@Injectable()
export class RecurringService {
    constructor(@InjectModel(Recurring.name) private readonly RecurringModel: Model<Recurring>) { }
    createRecurring(data: CreateRecurringDto) {
        // Logic to create a recurring payment
        console.log('Creating recurring payment with data:', data);
        return this.RecurringModel.create(data);

    }
}
