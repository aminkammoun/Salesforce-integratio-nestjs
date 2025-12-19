import {
  IsBoolean,
  IsDateString,
  IsEmail,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { StripeDto } from './stripe.dto';
import { AttributionDto } from './attribution.dto';

export class CreateOrderDto {

  // ===== Core =====
  @IsString()
  wcs_crm_reference_id: string;

  @IsNumber()
  order_id: number;

  @IsString()
  status: string;

  // ===== Payment =====
  @IsString()
  payment_method: string;

  @IsOptional()
  @IsString()
  payment_title?: string;

  @IsString()
  currency: string;

  @IsNumber()
  total: number;

  @IsOptional()
  @IsString()
  transaction_id?: string;

  // ===== Customer =====
  @IsOptional()
  @IsNumber()
  customer_id?: number;

  @IsEmail()
  billing_email: string;

  @IsOptional()
  @IsString()
  billing_phone?: string;

  // ===== Addresses =====
  @IsOptional()
  @IsString()
  billing_address_index?: string;

  @IsOptional()
  @IsString()
  shipping_address_index?: string;

  // ===== Stripe =====
  @IsOptional()
  @ValidateNested()
  @Type(() => StripeDto)
  stripe?: StripeDto;

  // ===== Hashes =====
  @IsOptional()
  @IsString()
  coupons_hash?: string;

  @IsOptional()
  @IsString()
  fees_hash?: string;

  @IsOptional()
  @IsString()
  shipping_hash?: string;

  @IsOptional()
  @IsString()
  taxes_hash?: string;

  // ===== Attribution =====
  @IsOptional()
  @ValidateNested()
  @Type(() => AttributionDto)
  attribution?: AttributionDto;

  // ===== Tax =====
  @IsOptional()
  @IsBoolean()
  is_vat_exempt?: boolean;

  // ===== Date =====
  @IsDateString()
  created: string;
}
