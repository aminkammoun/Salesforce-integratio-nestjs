import { PartialType } from '@nestjs/mapped-types';
import { CreateSponsorshipDto } from './create-sponsorship';

export class UpdateDonationDto extends PartialType(CreateSponsorshipDto) { }        