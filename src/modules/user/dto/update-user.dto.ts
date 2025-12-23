import { PartialType } from '@nestjs/mapped-types';
import { userCreateUserDto } from './create-user.dto';

export class UpdateUserDto extends PartialType(userCreateUserDto) {}