import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { Contact } from 'src/modules/contact/entities/contact.entity';

@Schema()
export class Transaction extends Document {
    @Prop({
        type: String,
        required: false,
        ref: Contact.name
    })
    contact: string;
    @Prop({ required: true, unique: true })
    transactionID: string;
    @Prop({ required: true })
    Payment__Amount__c: number;
    @Prop({ required: true })
    Payment__Amount_currency__c: string;
    @Prop({ required: true })
    Payment__Status__c: string;
    @Prop({ default: Date.now })
    createdAt: Date;
    @Prop({ required: true })
    Payment__Method_of_Payment__c: string;
    @Prop({ required: true })
    Payment__Contact__c: string;
    @Prop({ required: false })
    Payment__Payer_Address__c: string;
    @Prop({ required: false })
    Payment__Payer_City__c: string
    @Prop({ required: false })
    Payment__Payer_State__c: string
    @Prop({ required: false })
    Payment__Payer_Zip_Code__c: string
    @Prop({ required: false })
    Payment__Payer_First_Name__c: string
    @Prop({ required: false })
    Payment__Payer_Last_name__c: string
    @Prop({ required: false })
    Payment__Credit_Card__c: string
    @Prop({ required: false })
    Payment__Credit_Card_Type__c: string
    @Prop({ required: false })
    Payment__Credit_Card_Expiry_Date__c: string
    @Prop({ required: false })
    Payment__ACH_Account_Number__c: string
    @Prop({ required: false })
    Payment__ACH_Account_Type__c: string
    @Prop({ required: true })
    Stripe_Customer_ID__c: string;
    @Prop({
        type: String,
        required: false,
        ref: 'Donation'
    })
    donation: MongooseSchema.Types.ObjectId;
    @Prop({ required: false })
    note: string;
    @Prop({ required: false })
    salesforceDonation: string;
}

export const TransactionSchema = SchemaFactory.createForClass(Transaction);
