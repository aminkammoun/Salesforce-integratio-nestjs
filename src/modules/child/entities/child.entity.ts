import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

@Schema()
export class Child extends Document {
    @Prop({ required: true, unique: true })
    SalesforceID: string;
    @Prop({ required: true })
    Child_Name__c: string;
    @Prop({ required: true, unique: false })
    NationalityList__c: string;
    @Prop({ required: false })
    Age__c: number;
    @Prop({ required: true, enum: ['Available', 'Sponsored', 'Reserved', 'Archived'] })
    Status__c: string;
    @Prop({ required: true })
    url: string;
    @Prop({ default: Date.now })
    createdAt: Date;
    @Prop({ default: null, required: false })
    reservedAt: Date;
}

export const ChildSchema = SchemaFactory.createForClass(Child);
