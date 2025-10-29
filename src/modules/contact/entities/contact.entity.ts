import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema()
export class Contact extends Document {
  @Prop({ required: true, unique: true })
  salesforceID: string;
  @Prop({ required: true })
  Name: string;
  @Prop({ required: true })
  email: string;
  @Prop({ required: true })
  Phone: number;
  @Prop({ default: Date.now })
  createdAt: Date;
}

export const ContactSchema = SchemaFactory.createForClass(Contact);
