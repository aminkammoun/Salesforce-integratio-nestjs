import { Document, Schema as MongooseSchema } from 'mongoose';

export class SponsorshipCreatedEvent {
    sponsorshipID?: string;   
    donation: MongooseSchema.Types.ObjectId;      
    donor?: MongooseSchema.Types.ObjectId;   
    child: string[];
    Status: string;
    Recurring?: string;
    Start_Date__c?: Date;
    Donor__c?: string;
    id: string;
}