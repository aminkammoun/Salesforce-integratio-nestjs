import { Controller, Post, Request, UseGuards, Body } from '@nestjs/common';
import { AuthService } from '../services/auth.service';
import { LocalAuthGuard } from '../guards/local-auth.guard';
import { ApiOperation, ApiResponse, ApiBody, ApiTags } from '@nestjs/swagger';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) { }

  @UseGuards(LocalAuthGuard)
  @Post('/login')
  @ApiOperation({ summary: 'User login', description: 'Authenticates a user with email/username and password' })
  @ApiBody({ schema: { properties: { email: { type: 'string', example: 'user@example.com' }, password: { type: 'string', example: 'password123' } } } })
  @ApiResponse({ status: 200, description: 'User logged in successfully, returns JWT token' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(@Request() req: any) {
    // After LocalAuthGuard succeeds, Passport attaches the authenticated user to req.user
    return this.authService.login(req.user);
  }

  @Post('/signup')
  @ApiOperation({ summary: 'User signup', description: 'Creates a new user account' })
  @ApiBody({ schema: { properties: { email: { type: 'string', example: 'newuser@example.com' }, password: { type: 'string', example: 'password123' }, name: { type: 'string', example: 'John Doe' } } } })
  @ApiResponse({ status: 201, description: 'User registered successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input or user already exists' })
  async signUp(@Request() req: any) {
    await this.authService.signUp(req.body);
  }
  @Post('/validateUser')
  @ApiOperation({ summary: 'User validateUser', description: 'Creates a new user account' })
  @ApiBody({ schema: { properties: { email: { type: 'string', example: 'newuser@example.com' }, password: { type: 'string', example: 'password123' }, name: { type: 'string', example: 'John Doe' } } } })
  @ApiResponse({ status: 201, description: 'User registered successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input or user already exists' })
  async validateUser(@Request() req: any) {
    await this.authService.validateUser(req.body.email, req.body.password);
  }
}
