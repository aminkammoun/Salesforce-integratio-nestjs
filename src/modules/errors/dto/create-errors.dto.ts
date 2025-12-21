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

export class ErrorsDto {
    @IsString()
    message: string;

    @IsString()
    stack: string;

    @IsString()
    context: string;
}