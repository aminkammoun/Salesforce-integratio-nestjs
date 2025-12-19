import { IsDateString, IsNumber, IsOptional, IsString } from 'class-validator';

export class AttributionDto {
  @IsOptional()
  @IsString()
  device_type?: string;

  @IsOptional()
  @IsString()
  referrer?: string;

  @IsOptional()
  @IsNumber()
  session_count?: number;

  @IsOptional()
  @IsString()
  session_entry?: string;

  @IsOptional()
  @IsNumber()
  session_pages?: number;

  @IsOptional()
  @IsDateString()
  session_start_time?: string;

  @IsOptional()
  @IsString()
  source_type?: string;

  @IsOptional()
  @IsString()
  user_agent?: string;

  @IsOptional()
  @IsString()
  utm_content?: string;

  @IsOptional()
  @IsString()
  utm_medium?: string;

  @IsOptional()
  @IsString()
  utm_source?: string;
}
