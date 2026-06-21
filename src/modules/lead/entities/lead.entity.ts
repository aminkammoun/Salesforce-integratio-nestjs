import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema()
export class Lead extends Document {
  @Prop({ required: true })
  first_name: string;
  @Prop({ required: true })
  last_name: string;
  @Prop({ required: true, unique: false })
  phone: string;
  @Prop({ required: true, unique: false })
  address: string;
  @Prop({ required: true})
  event_id : string
  @Prop({ default: Date.now })
  createdAt: Date;
}

export const LeadSchema = SchemaFactory.createForClass(Lead);
