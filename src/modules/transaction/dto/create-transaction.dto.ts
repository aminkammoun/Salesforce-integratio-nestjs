import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {

    IsNumber,
    IsString,
    IsNotEmpty,
    IsOptional,
    Length,
    IsEnum,
    IsUUID,
    IsObject,
    IsISO8601,
    Min,
} from 'class-validator';

export enum TransactionStatus {
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

/**
 * DTO used when creating a new Transaction.
 * Adjust fields/types to match your entity if it differs.
 */
export class CreateTransactionDto {
    @ApiProperty({ description: 'Amount for the transaction', example: 100.5 })
    @IsNumber()
    @Min(0)
    @IsOptional()
    IATSPayment__Amount__c: number;

    @ApiProperty({ description: 'ISO currency code', example: 'USD' })
    @IsString()
    @IsNotEmpty()
    IATSPayment__Amount_currency__c: string;

    @ApiPropertyOptional({
        description: 'Reference or description for the transaction',
        example: 'donation-2025-01',
    })
    @IsOptional()
    @IsString()
    donation?: string;

    @ApiPropertyOptional({
        description: 'ID of the donor (user) initiating the transaction in the sub database',
        example: '0031t00000XyZzAAB',
    })
    @IsNotEmpty()
    contact?: string;

    @ApiPropertyOptional({ enum: PaymentMethod, example: PaymentMethod.CARD })
    @IsOptional()
    @IsEnum(PaymentMethod)
    IATSPayment__Method_of_Payment__c?: PaymentMethod;

    @ApiPropertyOptional({ enum: TransactionStatus, example: TransactionStatus.PENDING })
    @IsOptional()
    @IsEnum(TransactionStatus)
    IATSPayment__Status__c?: TransactionStatus;

    @ApiPropertyOptional({ description: 'Optional internal note', example: 'Recurring donation' })
    @IsOptional()
    @IsString()
    note?: string;

    @ApiPropertyOptional({
        description: 'Processing timestamp (ISO 8601) if already processed',
        example: '2025-01-02T15:04:05.000Z',
    })
    @IsNotEmpty()
    @ApiProperty({ description: 'Salesforce ID of the contact associated with the transaction', example: '0031t00000XyZzAAB' })
    @IsString()
    IATSPayment__Contact__c: string;

    @IsNotEmpty()
    @ApiProperty({ description: 'Unique transaction ID', example: 'txn_1234567890' })
    @IsString()
    transactionID: string;
    @ApiPropertyOptional({ description: "Payer's address (optional)", example: '123 Main St' })
    @IsOptional()
    @IsString()
    IATSPayment__Payer_Address__c?: string;

    @ApiPropertyOptional({ description: "Payer's city (optional)", example: 'Riyadh' })
    @IsOptional()
    @IsString()
    IATSPayment__Payer_City__c?: string;

    @ApiPropertyOptional({ description: "Payer's state (optional)", example: 'CA' })
    @IsOptional()
    @IsString()
    IATSPayment__Payer_State__c?: string;

    @ApiPropertyOptional({ description: "Payer's ZIP/postal code (optional)", example: '90210' })
    @IsOptional()
    @IsString()
    IATSPayment__Payer_Zip_Code__c?: string;

    @ApiPropertyOptional({ description: "Payer's first name (optional)", example: 'John' })
    @IsOptional()
    @IsString()
    IATSPayment__Payer_First_Name__c?: string;

    @ApiPropertyOptional({ description: "Payer's last name (optional)", example: 'Doe' })
    @IsOptional()
    @IsString()
    IATSPayment__Payer_Last_name__c?: string;

    @ApiPropertyOptional({ description: 'Last 4 digits of credit card (if provided)', example: '1234' })
    @IsOptional()
    @IsString()
    @Length(4, 4, { message: 'Credit card field must be exactly 4 characters (last 4 digits)' })
    IATSPayment__Credit_Card__c?: string;

    @ApiPropertyOptional({ description: 'Credit card type (optional)', example: 'Visa' })
    @IsOptional()
    @IsString()
    IATSPayment__Credit_Card_Type__c?: string;

    @ApiPropertyOptional({ description: 'Credit card expiry date (optional)', example: '12/2026' })
    @IsOptional()
    @IsString()
    IATSPayment__Credit_Card_Expiry_Date__c?: string;

    @ApiPropertyOptional({ description: 'Last 4 digits of ACH account number (if provided)', example: '5678' })
    @IsOptional()
    @IsString()
    @Length(4, 4, { message: 'ACH account number must be exactly 4 characters (last 4 digits)' })
    IATSPayment__ACH_Account_Number__c?: string;

    @ApiPropertyOptional({ description: 'ACH account type (optional)', example: 'Checking' })
    @IsOptional()
    @IsString()
    IATSPayment__ACH_Account_Type__c?: string;

    @ApiPropertyOptional({ description: 'Customer ID from strip', example: '  ' })
    @IsOptional()
    @IsString()
    Stripe_Customer_ID__c: string;
    @ApiPropertyOptional({ description: 'Customer ID from strip', example: '  ' })
    @IsOptional()
    @IsString()
    salesforceDonation: string;
}