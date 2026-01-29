import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { ChildToreserve } from 'src/config/types';
import { Contact } from 'src/modules/contact/entities/contact.entity';
import { CartItemDto, TransactionDetailDto } from '../dto/create-donation.dto';
import { Transaction } from 'src/modules/transaction/entities/transaction.entity';
import { CreateContactDto } from 'src/modules/contact/dto/create-contact.dto';

@Schema()
export class Donation extends Document {

    @Prop({ required: true })
    Name: string
    @Prop({ default: Date.now })
    CloseDate: Date
    @Prop({ required: true })
    StageName: string
    @Prop({ required: true })
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
    frequency: string
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
    })
    contact: string;
    @Prop({
        type: [{ type: MongooseSchema.Types.ObjectId, ref: 'Recurring' }],
        required: false,
        default: []
    })
    Recurring: MongooseSchema.Types.ObjectId[];
    @Prop({ required: false })
    npe03__Recurring_Donation__c: string[];
    @Prop({ required: false })
    macAddress: string
    @Prop({ required: false })
    customerStripe: string
    @Prop({ required: false })
    cartItems: CartItemDto[]
    @Prop({ required: false })
    timeToProcessDonationMs: number
    @Prop({ required: false })
    transactionDetails: TransactionDetailDto
    @Prop({ required: false })
    campaignId: string
    /*@Prop({ required: false })
    recordType : string
    @Prop({ required: false })
    child__c : string*/
    @Prop({ required: false })
    Contact_details: CreateContactDto;
}
export const DonationSchema = SchemaFactory.createForClass(Donation);