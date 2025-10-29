import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema()
export class Child extends Document {
    @Prop({ required: true, unique: true })
    SalesforceID: string;
    @Prop({ required: true })
    Child_Name__c: string;
    @Prop({ required: true, unique: true })
    NationalityList__c: string;
    @Prop({ required: false })
    Age__c: number;
    @Prop({ required: true, enum: ['Available', 'Sponsored', 'Archived']  })
    Status__c: string;
    @Prop({ required: true })
    url : string;
    @Prop({ default: Date.now })
    createdAt: Date;
}

export const ChildSchema = SchemaFactory.createForClass(Child);
