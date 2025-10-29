import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateChildDto {
    @ApiProperty({ description: "Salesforce's unique ID for the child" })
    SalesforceID: string;

    @ApiProperty({ description: 'Child full name' })
    Child_Name__c: string;

    @ApiProperty({ description: 'Nationality or nationalities list (string)' })
    NationalityList__c: string;

    @ApiPropertyOptional({ description: 'Calculated age (optional)', example: 10 })
    Age__c?: number;

    @ApiProperty({ description: 'Status of the child', enum: ['Available', 'Sponsored', 'Archived'], example: 'Available' })
    Status__c: 'Available' | 'Sponsored' | 'Archived';

    @ApiPropertyOptional({ description: 'URL to child resource (optional)', example: '/services/data/..' })
    url? : string;
}