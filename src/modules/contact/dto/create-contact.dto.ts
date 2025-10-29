import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateContactDto {
  @ApiProperty({ description: 'Salesforce unique identifier for the contact', example: '0031t00000XyZzAAB' })
  salesforceID: string;

  @ApiProperty({ description: 'Full name of the contact' })
  Name: string;

  @ApiProperty({ description: 'Email address of the contact', example: 'user@example.com' })
  email: string;

  @ApiProperty({ description: 'Phone number of the contact', example: '+1234567890' })
  Phone: string;

  @ApiPropertyOptional({ description: 'Role of the contact (optional)', example: 'Donor' })
  role?: string;
}
