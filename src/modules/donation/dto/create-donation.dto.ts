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
export class CartItemDto {
    @ApiProperty({ description: 'Item name', example: 'Child Sponsorship Package' })
    Name: string;

    @ApiProperty({ description: 'Type of donation', enum: ['one-time', 'recurring', 'sponsorship'], example: 'sponsorship' })
    type: 'one-time' | 'recurring' | 'sponsorship';

    @ApiProperty({ description: 'Billing interval for recurring donations', enum: ['monthly', 'quarterly', 'yearly'], example: 'monthly' })
    interval: 'monthly' | 'quarterly' | 'yearly';

    @ApiPropertyOptional({ description: 'Program ID for program donations', example: 'prog_12345' })
    programId?: string;

    @ApiPropertyOptional({ description: 'Child ID for child sponsorships', example: '64b8f9c2a2...' })
    childId?: string;

    @ApiProperty({ description: 'Donation amount in USD', example: 50.00 })
    amount: number;

    @ApiPropertyOptional({ description: 'Number of children for bulk sponsorships', example: 5 })
    Requestedcount?: number;

    @ApiPropertyOptional({ description: 'Nationality filter for child sponsorships', example: 'Haiti' })
    nationality?: string;

    @ApiProperty({ description: 'Salesforce recurring donation ID : don"t send it in the query', example: 'a0A4100000QR1UEAW' })
    npe03__Recurring_Donation__c: string;

    @ApiProperty({ description: 'Salesforce record ID : don"t send it in the query ', example: '0061t00000XyZzAAB' })
    sfId: string;

    @ApiPropertyOptional({ description: 'Donation made on behalf of another person', example: 'John Smith' })
    on_behalf_of?: string;
}
export class TransactionDetailDto {
    @ApiPropertyOptional({ description: 'Whether transaction was captured', example: 'true' })
    captured?: string;

    @ApiPropertyOptional({ description: 'Transaction amount', example: 100.00 })
    amount?: number;

    @ApiPropertyOptional({ description: 'Transaction currency code', example: 'USD' })
    currency?: string;

    @ApiPropertyOptional({ description: 'Stripe customer ID', example: 'cus_12345' })
    customer_id?: string;

    @ApiPropertyOptional({ description: 'Transaction fee amount', example: 2.50 })
    fee?: number;

    @ApiPropertyOptional({ description: 'Net amount after fees', example: 97.50 })
    net?: number;

    @ApiPropertyOptional({ description: 'Stripe payment intent ID', example: 'pi_1234567890' })
    intent_id?: string;

    @ApiPropertyOptional({ description: 'Stripe payment source ID', example: 'src_1234567890' })
    source_id?: string;

    @ApiPropertyOptional({ description: 'Payment method type', example: 'card' })
    payment_type?: string;
    @ApiPropertyOptional({ description: 'if subscription_id', example: 'syb_xxxxxxx' })

    subscription_id?: string;
}
export class CreateDonationDto {
    @ApiPropertyOptional({
        description: 'donor contact',
        example: '64b8f9c2a2...'
    })
    @IsString()
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

    /* @ApiPropertyOptional({ description: 'Monetary amount of the donation', example: 250.5 })
    @IsNotEmpty()
    @IsNumber()
    Amount: number; */

    @ApiPropertyOptional({ description: "Primary contact's Salesforce ID (optional)", example: '0031t00000XyZzAAB' })
    @IsOptional()
    @IsString()
    npsp__Primary_Contact__c?: string;

    @ApiPropertyOptional({ description: 'Donation source (optional)', example: 'Website' })
    @IsOptional()
    @IsString()
    Donation_Source__c?: string;

    /* @ApiPropertyOptional({ description: 'Record Type Id (optional)', example: '0121t000000XyZ' })
    @IsOptional()
    @IsString()
    RecordTypeId?: string; */

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
    /* @ApiPropertyOptional({ description: 'Is the donation recurring?', example: false })
    @IsOptional()
    isRecurring?: boolean; */
    @ApiPropertyOptional({ description: 'If associated with a Recurring plan, pass the Recurring document _id here', example: '64b8f9c2a2...' })
    @IsOptional()
    @IsString()
    Recurring?: string[];
    /* @ApiPropertyOptional({ description: 'If recurring, frequency in months (e.g. 1=monthly, 3=Yearly)', example: 1 })
    @IsNotEmpty()
    @IsEnum(Frequency)
    frequency: Frequency; */
    @ApiPropertyOptional({ description: 'Frequency of recurring donation', enum: Frequency, example: Frequency.MONTHLY })
    @IsOptional()
    donation_details?: ChildToreserve[];

    @ApiPropertyOptional({ description: 'Tracking flag for whether donation was synced to Salesforce', example: false })
    @IsOptional()
    syncedWithSalesforce?: boolean;

    @ApiPropertyOptional({ description: 'MAC address of the device that initiated the donation', example: '00:1A:2B:3C:4D:5E' })
    @IsOptional()
    macAdress?: string;

    @ApiPropertyOptional({ description: 'Stripe customer ID associated with this donation', example: 'cus_12345' })
    @IsOptional()
    customerStipe?: string;

    @ApiPropertyOptional({ description: 'Array of Salesforce recurring donation IDs', isArray: true, example: ['a0A4100000QR1UEAW'] })
    @IsOptional()
    npe03__Recurring_Donation__c?: string[];

    @ApiPropertyOptional({ description: 'Array of cart items included in this donation', type: [CartItemDto] })
    @IsOptional()
    cartItems: CartItemDto[];

    @ApiPropertyOptional({ description: 'Time taken to process the donation in milliseconds', example: 1500 })
    @IsOptional()
    timeToProcessDonationMs?: number;

    @ApiPropertyOptional({ description: 'Detailed transaction information from payment processor', type: TransactionDetailDto })
    @IsOptional()
    transactionDetails?: TransactionDetailDto;
}

export default CreateDonationDto;
