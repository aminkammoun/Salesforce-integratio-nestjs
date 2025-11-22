import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { Contact } from 'src/modules/contact/entities/contact.entity';
import { Child } from 'src/modules/child/entities/child.entity';
import { Donation } from 'src/modules/donation/entities/donation.entity';
import { Recurring } from 'src/modules/recurring/entities/recurring.entity';

@Schema()
export class Sponsorship extends Document {
    @Prop({ type: String })
    name: string

    @Prop({
        type: String,
        required: true,
        unique: true,
        sparse: true, // Only index non-null values
    })
    sponsorshipID: string;

    @Prop({
        type: [{ type: String }],
        required: true,
        default: []
    })
    child: string[];
    @Prop({
        type: MongooseSchema.Types.ObjectId,
        required: true,
        ref: Contact.name
    })
    donor: MongooseSchema.Types.ObjectId;
    @Prop({
        type: MongooseSchema.Types.ObjectId,
        required: true,
        ref: Donation.name
    })
    donation: MongooseSchema.Types.ObjectId;
    @Prop({ required: true })
    Status: string;
    @Prop({
        type: MongooseSchema.Types.ObjectId,
        required: false,
    })
    Recurring: string;
    @Prop({ default: Date.now })
    Start_Date__c: Date
    @Prop({ required: false })
    Donor__c: string;
    @Prop({ required: false })
    Current_Recurring_Donation__c: string;
    @Prop({ required: false, default: false })
    syncedWithSalesforce: boolean;
    @Prop({ required: false })
    salesforceID: string
}

export const SponsorshipSchema = SchemaFactory.createForClass(Sponsorship);