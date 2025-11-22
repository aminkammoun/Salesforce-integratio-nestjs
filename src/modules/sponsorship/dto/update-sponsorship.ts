import { PartialType } from '@nestjs/mapped-types';
import { CreateSponsorshipDto } from './create-sponsorship';

export class UpdateSponsorshipDto extends PartialType(CreateSponsorshipDto) { }        