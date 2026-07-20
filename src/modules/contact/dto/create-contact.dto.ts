import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional } from 'class-validator';

export class ContactData {
  householdMailingAddress?: string;
  MailingStreet?: string;
  MailingCity?: string;
  MailingState?: string;
  MailingPostalCode?: string;
  MailingCountry?: string;
  email?: string;
}

export class CreateContactDto {
  @ApiProperty({ description: 'Salesforce unique identifier for the contact', example: '0031t00000XyZzAAB' })
  @IsOptional()
  salesforceID: string;

  @ApiProperty({ description: 'Full name of the contact' })
  @IsOptional()

  Name: string;

  @ApiProperty({ description: 'Email address of the contact', example: 'user@example.com' })
  @IsOptional()
  email: string;
  @IsOptional()
  @ApiPropertyOptional({ description: 'First name of the contact', example: 'John' })
  first_name?: string;
  @IsOptional()
  @ApiPropertyOptional({ description: 'Last name of the contact', example: 'Doe' })
  last_name?: string;
  @ApiProperty({ description: 'Phone number of the contact', example: '+1234567890' })
  Phone: string;

  @ApiPropertyOptional({ description: 'Role of the contact (optional)', example: 'Donor' })
  role?: string;
  @ApiPropertyOptional({ description: 'WordPress ID of the contact (optional)', example: 12345 })
  wordpressID?: number;

  Email_Opt_In_Consent__c: Boolean
}
