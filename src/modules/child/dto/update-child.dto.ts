import { PartialType } from '@nestjs/mapped-types';
class ChildDto {
    firstName: string;
    lastName: string;
    nationality: string;
    status: 'Available' | 'Sponsored' | 'Archived';
}
export class UpdateContactDto extends PartialType(ChildDto) { }