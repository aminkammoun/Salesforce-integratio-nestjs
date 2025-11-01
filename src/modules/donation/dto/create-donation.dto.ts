import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsNumber, IsISO8601, IsEnum } from 'class-validator';

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
/**
 * DTO used to create a Donation record.
 * Mirrors the Donation entity fields and includes Swagger metadata + validation.
 */
export class CreateDonationDto {
    @ApiProperty({ description: 'Unique donation ID (Salesforce or internal)', example: 'don_123456' })
    @IsString()
    @IsNotEmpty()
    donationID: string;

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
    Event__c?: string;

    @ApiPropertyOptional({ description: 'Acknowledgment status (optional)', example: 'Pending' })
    @IsString()
    @IsEnum(AcknowledgmentStatus)
    npsp__Acknowledgment_Status__c?: AcknowledgmentStatus;

    @ApiPropertyOptional({ description: 'Id of the donation after insert into salesforce(optional)', example: '0121t000000XyZ' })
    @IsString()
    salesforceID?: string;
}

export default CreateDonationDto;
