import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { Contact } from 'src/modules/contact/entities/contact.entity';
import { Child } from 'src/modules/child/entities/child.entity';
import { Donation } from 'src/modules/donation/entities/donation.entity';
import { Recurring } from 'src/modules/recurring/entities/recurring.entity';

@Schema()
export class Sponsorship extends Document {
    @Prop({type: String})
    name: string

    @Prop({
        type: String,
        required: true,
        unique: true,
        sparse: true, // Only index non-null values
    })
    sponsorshipID: string;

    @Prop({
        type: MongooseSchema.Types.ObjectId,
        required: true,
        ref: Child.name,
        unique: true  // Ensures one-to-one relationship with Child
    })
    child: MongooseSchema.Types.ObjectId;
    @Prop({
        type: MongooseSchema.Types.ObjectId,
        required: true,
        ref: Contact.name
    })
    donor: MongooseSchema.Types.ObjectId;
    @Prop({
        type: String,
        required: true,
        ref: Donation.name
    })
    donation: string;
    @Prop({ required: true })
    Status: string;
    @Prop({
        type: MongooseSchema.Types.ObjectId,
        required: false,
    })
    Recurring: string;
    @Prop({ default: Date.now })
    Start_Date__c: Date

}

export const SponsorshipSchema = SchemaFactory.createForClass(Sponsorship);