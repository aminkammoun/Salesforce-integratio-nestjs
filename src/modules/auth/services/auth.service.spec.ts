import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UserService } from '../../user/services/user.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

describe('AuthService', () => {
  let service: AuthService;
  let userService: jest.Mocked<UserService>;
  let jwtService: jest.Mocked<JwtService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UserService,
          useValue: {
            findByEmail: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn().mockReturnValue('jwt-token'),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userService = module.get(UserService) as jest.Mocked<UserService>;
    jwtService = module.get(JwtService) as jest.Mocked<JwtService>;
    jest.spyOn(bcrypt, 'compare').mockResolvedValue(true);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return a validated user without the password', async () => {
    userService.findByEmail.mockResolvedValue({
      _id: 'user-123',
      email: 'user@example.com',
      password: 'hashed-password',
      role: 'USER',
    } as any);

    const result = await service.validateUser('user@example.com', 'plain-password');

    expect(result).toMatchObject({
      _id: 'user-123',
      email: 'user@example.com',
      role: 'USER',
      result: true,
      message: 'User validated successfully',
    });
    expect(result.password).toBeUndefined();
  });

  it('should generate a JWT using the validated user payload', async () => {
    const user = {
      _id: 'user-123',
      email: 'user@example.com',
      role: 'USER',
    };

    const result = await service.login(user as any);

    expect(jwtService.sign).toHaveBeenCalledWith({
      email: 'user@example.com',
      sub: 'user-123',
      role: 'USER',
    });
    expect(result).toEqual({
      _id: 'user-123',
      role: 'USER',
      access_token: 'jwt-token',
    });
  });
});
