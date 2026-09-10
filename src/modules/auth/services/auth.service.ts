import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UserService } from '../../user/services/user.service';
import { JwtService } from '@nestjs/jwt';
import { userCreateUserDto } from '../../user/dto/create-user.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private userService: UserService,
    private jwtService: JwtService,
  ) {}

  async validateUser(email: string, pass: string): Promise<any> {
    const user = await this.userService.findByEmail(email);

    if (!user) {
      return { result: false, message: 'Invalid credentials' };
    }

    const passwordIsValid = await bcrypt.compare(pass, user.password);
    if (!passwordIsValid) {
      return { result: false, message: 'Invalid credentials' };
    }

    const plainUser = user.toObject ? user.toObject() : user;
    const { password, ...safeUser } = plainUser;

    return {
      ...safeUser,
      result: true,
      message: 'User validated successfully',
    };
  }

  async login(user: any) {
    if (!user || !user.email) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = {
      email: user.email,
      sub: user._id || user.id,
      role: user.role,
    };

    return {
      _id: user._id || user.id,
      role: payload.role,
      access_token: this.jwtService.sign(payload),
    };
  }

  async signUp(user: userCreateUserDto) {
    await this.userService.create(user);
  }
}
