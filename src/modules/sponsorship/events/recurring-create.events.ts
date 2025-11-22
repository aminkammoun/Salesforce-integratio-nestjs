import { Document, Schema as MongooseSchema } from 'mongoose';

export class RecurringCreatedEvent {
       name: string
       donorType: string;
       frequency: string;
       amount: number;
       dateEstablished: Date;
       effectiveDate: Date;
       DayOfMonth: number;
       donations: MongooseSchema.Types.ObjectId[];
       sponsorships: MongooseSchema.Types.ObjectId[];
       child: MongooseSchema.Types.ObjectId;  
   
}