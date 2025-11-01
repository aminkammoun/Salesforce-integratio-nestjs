import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

@Schema()
export class Donation extends Document {
    @Prop({ required: true, unique: true })
    donationID: string;
    @Prop({ required: true })
    Name : string
    @Prop({ default: Date.now })
    CloseDate : Date
    @Prop({ required: true })
    StageName : string
    @Prop({ required: false })
    Amount : number
    @Prop({ required: false })
    npsp__Primary_Contact__c : string
    @Prop({ required: false })
    Donation_Source__c : string
    @Prop({ required: false })
    RecordTypeId : string
    @Prop({ required: false })
    Payment_Method__c : string
    @Prop({ required: false })
    Event__c : string    
    @Prop({ required: false })
    npsp__Acknowledgment_Status__c : string
    @Prop({ required: false })
    salesforceID : string
}
export const DonationSchema = SchemaFactory.createForClass(Donation);