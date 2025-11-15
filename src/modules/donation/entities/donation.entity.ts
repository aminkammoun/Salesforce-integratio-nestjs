import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { ChildToreserve } from 'src/config/types';
import { Contact } from 'src/modules/contact/entities/contact.entity';

@Schema()
export class Donation extends Document {

    @Prop({ required: true })
    Name: string
    @Prop({ default: Date.now })
    CloseDate: Date
    @Prop({ required: true })
    StageName: string
    @Prop({ required: false })
    Amount: number
    @Prop({ required: false })
    npsp__Primary_Contact__c: string
    @Prop({ required: false })
    Donation_Source__c: string
    @Prop({ required: false })
    RecordTypeId: string
    @Prop({ required: false })
    Payment_Method__c: string
    @Prop({ required: false })
    Category: string
    @Prop({ required: false })
    Acknowledgment_Status__c: string
    @Prop({ required: false })
    frequency?: string
    
    @Prop({ required: false })
    donation_details: ChildToreserve[];
    // Flag to track sync status with Salesforce
    @Prop({ required: false, default: false })
    syncedWithSalesforce: boolean;
    @Prop({ required: false })
    salesforceID: string
    @Prop({ required: false, default: false })
    isRecurring: boolean
    @Prop({ required: false, unique: true })
    donationID: string;
    @Prop({
        type: String,
        required: false,
        ref: Contact.name
    })
    contact: string;

}
export const DonationSchema = SchemaFactory.createForClass(Donation);