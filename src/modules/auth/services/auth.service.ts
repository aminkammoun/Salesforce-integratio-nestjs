import { Injectable } from '@nestjs/common';
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
    if (user) {
      const passwordIsValid = await bcrypt.compare(pass, user.password);
      if (passwordIsValid) {
        
        //const { password, ...result } = user;
  
        return {result :  passwordIsValid , message: 'User validated successfully'};
      }
    }
    return {result: false, message: 'Invalid credentials'};
  }

  async login(user: any) {
    const payload = { email: user.email, sub: user._id, role: user.role };
    return {
      _id: user.id,
      role: payload.role,
      access_token: this.jwtService.sign(payload),
    };
  }

  async signUp(user: userCreateUserDto) {
    await this.userService.create(user);
  }
}
