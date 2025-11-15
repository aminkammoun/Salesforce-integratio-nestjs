import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsNumber, IsISO8601, IsEnum } from 'class-validator';
import { ChildToreserve } from 'src/config/types';

export enum DonationStageName {
    PENDING = 'pending',
    COMPLETED = 'completed',
    FAILED = 'failed',
    CANCELLED = 'cancelled',
}

export enum PaymentMethod {
    CARD = 'credit card',
    ACH = 'ACH',
    BANK_TRANSFER = 'bank_transfer',
    PAYPAL = 'paypal',
    CASH = 'cash',
    OTHER = 'other',
}
export enum AcknowledgmentStatus {
    Acknowledged = 'Acknowledged',
    DONOTACKNOWLEDGED = 'Do Not Acknowledge',
    TOBEACKNOWLEDGED = 'To Be Acknowledged',
    EMAILACKNOWLEDGEDNOW = 'Email Acknowledged Now',
    EMAILACKNOWLEDGEDNOTSENT = 'Email Acknowledged Not Sent',
}
export enum Frequency {
    ONETIME = 'One time',
    MONTHLY = 'Monthly',
    YEARLY = 'Yearly',

}
/**
 * DTO used to create a Donation record.
 * Mirrors the Donation entity fields and includes Swagger metadata + validation.
 */
export class CreateDonationDto {

    @IsNotEmpty()
    contact?: string;
    @ApiPropertyOptional({
        description: 'ID of the donor (user) initiating the transaction in the sub database',
        example: '0031t00000XyZzAAB',
    })
    @IsOptional()
    contactSalesforceID?: string;
    @ApiProperty({ description: 'Donation name', example: 'General Fund Donation' })
    @IsString()
    @IsNotEmpty()
    Name: string;

    @ApiPropertyOptional({ description: 'Close date (ISO 8601). If omitted, server may set default.', example: '2025-10-30T00:00:00.000Z' })
    @IsOptional()
    @IsISO8601()
    CloseDate?: string;

    @ApiProperty({ description: 'Stage name for the donation (e.g. Closed Won)', example: 'Closed Won' })
    @IsString()
    @IsNotEmpty()
    StageName: string;

    @ApiPropertyOptional({ description: 'Monetary amount of the donation', example: 250.5 })
    @IsOptional()
    @IsNumber()
    Amount?: number;

    @ApiPropertyOptional({ description: "Primary contact's Salesforce ID (optional)", example: '0031t00000XyZzAAB' })
    @IsOptional()
    @IsString()
    npsp__Primary_Contact__c?: string;

    @ApiPropertyOptional({ description: 'Donation source (optional)', example: 'Website' })
    @IsOptional()
    @IsString()
    Donation_Source__c?: string;

    @ApiPropertyOptional({ description: 'Record Type Id (optional)', example: '0121t000000XyZ' })
    @IsOptional()
    @IsString()
    RecordTypeId?: string;

    @ApiPropertyOptional({ enum: PaymentMethod, example: PaymentMethod.CARD })
    @IsOptional()
    @IsString()
    @IsEnum(PaymentMethod)
    Payment_Method__c?: PaymentMethod;

    @ApiPropertyOptional({ description: 'Associated Event (optional)', example: 'Charity Gala 2025' })
    @IsOptional()
    @IsString()
    category?: string;

    @ApiPropertyOptional({ description: 'Acknowledgment status (optional)', example: 'Pending' })
    @IsString()
    @IsEnum(AcknowledgmentStatus)
    Acknowledgment_Status__c?: AcknowledgmentStatus;

    @ApiPropertyOptional({ description: 'Id of the donation after insert into salesforce(optional)', example: '0121t000000XyZ' })
    @IsOptional()
    @IsString()
    salesforceID?: string;
    @ApiPropertyOptional({ description: 'Is the donation recurring?', example: false })
    @IsOptional()
    isRecurring?: boolean;
    @ApiPropertyOptional({ description: 'If associated with a Recurring plan, pass the Recurring document _id here', example: '64b8f9c2a2...' })
    @IsOptional()
    @IsString()
    Recurring?: string;
    @ApiPropertyOptional({ description: 'If recurring, frequency in months (e.g. 1=monthly, 3=Yearly)', example: 1 })
    @IsOptional()
    @IsEnum(Frequency)
    frequency?: Frequency;
    @ApiPropertyOptional({ description: 'If recurring, frequency in months (e.g. 1=monthly, 3=Yearly)', example: 1 })
    @IsOptional()
    donation_details?: ChildToreserve[];
    @ApiPropertyOptional({ description: 'If recurring, frequency in months (e.g. 1=monthly, 3=Yearly)', example: 1 })
    @IsOptional()
    syncedWithSalesforce?: boolean;
}

export default CreateDonationDto;
