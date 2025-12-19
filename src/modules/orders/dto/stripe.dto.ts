import { IsNumber, IsOptional, IsString } from 'class-validator';

export class StripeDto {
  @IsOptional()
  @IsString()
  captured?: string;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsString()
  customer_id?: string;

  @IsOptional()
  @IsNumber()
  fee?: number;

  @IsOptional()
  @IsNumber()
  net?: number;

  @IsOptional()
  @IsString()
  intent_id?: string;

  @IsOptional()
  @IsString()
  source_id?: string;

  @IsOptional()
  @IsString()
  payment_type?: string;
}
