import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsNumber, IsISO8601, IsEnum } from 'class-validator';

export class CreateRecurringDto {
    @ApiPropertyOptional({ 
        description: 'Unique sponsorship ID. If not provided, one will be generated.',
        example: 'SP1234567890123'
    })
    @IsOptional()
    @IsString()
    donorType?: string;
    @ApiProperty({ description: 'Unique donation ID (Salesforce or internal)', example: 'don_123456' })
    @IsString()
    @IsNotEmpty()
    frequency: string
    @ApiPropertyOptional({ description: 'ID of the donor (user) initiating the transaction in the sub database', example: '0031t00000XyZzAAB', })
    @IsNotEmpty()
    amount?: number;    
    @ApiPropertyOptional({ description: 'Close date (ISO 8601). If omitted, server may set default.', example: '2025-10-30T00:00:00.000Z' })
    @IsOptional()
    @IsISO8601()
    dateEstablished?: string;
    @ApiPropertyOptional({ description: 'Close date (ISO 8601). If omitted, server may set default.', example: '2025-10-30T00:00:00.000Z' })
    @IsOptional()
    @IsISO8601()
    effectiveDate?: string;
    @ApiPropertyOptional({ description: '25', example: '25' })
    @IsNumber()
    @IsNotEmpty()
    DayOfMonth?: number;
    @ApiPropertyOptional({ description: 'Associated Donations (optional)', example: ['don_123456', 'don_789012'] })
    @IsOptional()
    @IsString({ each: true })
    donations?: string[];
    @ApiPropertyOptional({ description: 'Associated Sponsorships (optional)', example: ['SP1234567890123', 'SP9876543210987'] })
    @IsOptional()
    @IsString({ each: true })
    sponsorships?: string[];
    
}