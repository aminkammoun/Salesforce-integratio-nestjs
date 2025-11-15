import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsNumber, IsISO8601, IsEnum } from 'class-validator';

export class CreateSponsorshipDto {
    @ApiPropertyOptional({
        description: 'Unique sponsorship ID. If not provided, one will be generated.',
        example: 'SP1234567890123'
    })
    @IsOptional()
    @IsString()
    sponsorshipID?: string;
    @ApiProperty({ description: 'Unique donation ID (Salesforce or internal)', example: 'don_123456' })
    @IsString()
    @IsNotEmpty()
    donation: string;
    @ApiPropertyOptional({
        description: 'ID of the donor (user) initiating the transaction in the sub database',
        example: '0031t00000XyZzAAB',
    })
    @IsNotEmpty()
    donor?: string;

    @ApiPropertyOptional({
        description: 'ID of the donor (user) initiating the transaction in the sub database',
        example: '0031t00000XyZzAAB',
    })
    @IsNotEmpty()
    child: string[];
    @ApiProperty({ description: 'Unique donation ID (Salesforce or internal)', example: 'don_123456' })
    @IsString()
    @IsNotEmpty()
    Status: string;

    @ApiProperty({ description: 'Unique donation ID (Salesforce or internal)', example: 'don_123456' })
    @IsString()
    @IsOptional()
    Recurring?: string;
    @ApiPropertyOptional({ description: 'Start_Date__c (ISO 8601). If omitted, server may set default.', example: '2025-10-30T00:00:00.000Z' })
    @IsOptional()
    @IsISO8601()
    Start_Date__c?: string;
    @ApiPropertyOptional({
        description: 'ID of the donor (user) initiating the transaction in the sub database',
        example: '0031t00000XyZzAAB',
    })
    @IsOptional()
    @IsString()
    Donor__c?: string;
}

