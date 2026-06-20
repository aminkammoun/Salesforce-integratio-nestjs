import { PartialType } from '@nestjs/mapped-types';
import { leadCreateLeadDto } from './create-lead.dto';

export class UpdateleadDto extends PartialType(leadCreateLeadDto) {}