import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

@Schema()
export class Contact extends Document {
  // Salesforce contacts have IDs, local contacts start without one
  // sparse: true ensures uniqueness only applies to docs that have a salesforceID
  @Prop({ 
    required: false
    
  })
  salesforceID: string;

  // Flag to track sync status with Salesforce
  @Prop({ required: false, default: false })
  syncedWithSalesforce: boolean;

  // Virtual property for sponsorships
  sponsorships: any[]; // Will be populated with Sponsorship documents
  @Prop({ required: false })
  Name: string;
  @Prop({ required: true })
  email: string;
  @Prop({ required: false })
  first_name: string;
  @Prop({ required: false })
  last_name: string;
  @Prop({ required: true })
  Phone: string;
  @Prop({ default: Date.now })
  createdAt: Date;
}

export const ContactSchema = SchemaFactory.createForClass(Contact);

// Add virtual populate for sponsorships
ContactSchema.virtual('sponsorships', {
  ref: 'Sponsorship',
  localField: '_id',
  foreignField: 'donor'
});

// Ensure virtuals are included when converting documents to JSON
ContactSchema.set('toJSON', { virtuals: true });
ContactSchema.set('toObject', { virtuals: true });
