import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class errors extends Document {
    @Prop({ required: true })
    message: string;

    @Prop({ required: true })
    stack: string;

    @Prop({ required: true })
    context: string;
}
export const ErrorsSchema = SchemaFactory.createForClass(errors);