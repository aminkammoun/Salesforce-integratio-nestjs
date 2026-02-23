import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
@Schema()
export class Log extends Document {
    @Prop()
    name: string;

    @Prop({ default: () => new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Chicago' })) })
    date: Date;

    @Prop()
    status: string;
}
export const LogSchema = SchemaFactory.createForClass(Log);