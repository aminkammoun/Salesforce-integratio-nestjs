import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { Donation } from 'src/modules/donation/entities/donation.entity';
import { Sponsorship } from 'src/modules/sponsorship/entities/sponsorship.entity';

@Schema()
export class Recurring extends Document {
    @Prop({ type: String })
    name: string
    @Prop({ required: true })
    donorType: string;
    @Prop({ required: true })
    frequency: string;
    @Prop({ required: true })
    amount: number;
    @Prop({ default: Date.now })
    dateEstablished: Date;
    @Prop({ required: false, default: Date.now })
    effectiveDate: Date;
    @Prop({ required: false })
    DayOfMonth: number;
    @Prop({
        type: MongooseSchema.Types.ObjectId,
        required: false,
    })
    donations: MongooseSchema.Types.ObjectId;
    @Prop({
        type: MongooseSchema.Types.ObjectId,
        required: false,
    })
    sponsorships: MongooseSchema.Types.ObjectId;
    @Prop({
        type: MongooseSchema.Types.ObjectId,
        required: false,
    })
    donor: MongooseSchema.Types.ObjectId;
    @Prop({ required: false })
    salesforceID: string
    @Prop({ type: String })
    npe03__Contact__c: string;
    @Prop({ type: String })
    donationSf: string;
    @Prop({ type: String })
    sponsorshipSf: string;
    @Prop({ type: String })
    contactSf: string;
    @Prop({ type: String })
    status: string;
    @Prop({ required: false, default: false })
    syncedWithSalesforce: boolean;
}

export const RecurringSchema = SchemaFactory.createForClass(Recurring);