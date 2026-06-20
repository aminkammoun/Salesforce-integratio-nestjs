import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema()
export class Lead extends Document {
  @Prop({ required: true })
  first_name: string;
  @Prop({ required: true })
  last_name: string;
  @Prop({ required: true, unique: true })
  phone: string;
  @Prop({ required: true, unique: true })
  address: string;
  @Prop({ default: Date.now })
  createdAt: Date;
}

export const LeadSchema = SchemaFactory.createForClass(Lead);
