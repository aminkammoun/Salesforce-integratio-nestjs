import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema()
export class Child extends Document {
    @Prop({ required: true })
    firstName: string;
    @Prop({ required: true })
    lastName: string;
    @Prop({ required: true, unique: true })
    Nationality: string;
    @Prop({ required: true })
    status: number;
    @Prop({ default: Date.now })
    createdAt: Date;
}

export const ContactSchema = SchemaFactory.createForClass(Child);
