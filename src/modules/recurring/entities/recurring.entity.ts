import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { Donation } from 'src/modules/donation/entities/donation.entity';
import { Sponsorship } from 'src/modules/sponsorship/entities/sponsorship.entity';

@Schema()
export class Recurring extends Document {
    @Prop({ type: String })
    name: string
    @Prop({ required: true, unique: true })
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
        type: [{ type: MongooseSchema.Types.ObjectId, ref: Donation.name }],
        required: false,
        default: []
    })
    donations: MongooseSchema.Types.ObjectId[];
    @Prop({
        type: [{ type: MongooseSchema.Types.ObjectId, ref: Sponsorship.name }],
        required: false,
        default: []
    })
    sponsorships: MongooseSchema.Types.ObjectId[];

}

export const RecurringSchema = SchemaFactory.createForClass(Recurring);