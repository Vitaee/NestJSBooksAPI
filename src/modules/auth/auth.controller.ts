import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UsePipes,
  ValidationPipe,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AuthService, AuthResponse } from './auth.service';
import { RegisterDto, LoginDto } from './dto';
import { Public } from './decorators/public.decorator';
import { AppLoggerService } from '../../utils/nestjs-logger.service';
import { successResponse } from '../../utils/response.helper';

@ApiTags('Authentication')
@Controller('auth')
@UsePipes(new ValidationPipe({ transform: true }))
export class AuthController {

  constructor(
    private readonly authService: AuthService,
    private readonly appLogger: AppLoggerService,
  ) {}

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Register a new user',
    description: 'Create a new user account with email and password',
  })
  @ApiResponse({
    status: 201,
    description: 'User successfully registered',
    schema: {
      type: 'object',
      properties: {
        user: {
          type: 'object',
          properties: {
            id: { type: 'number', format: 'id' },
            email: { type: 'string', format: 'email' },
          },
        },
        access_token: { type: 'string' },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid input data or validation failed',
  })
  @ApiConflictResponse({
    description: 'User with this email already exists',
  })
  async register(@Body() registerDto: RegisterDto) {

    try {
      const result = await this.authService.register(registerDto);

      this.appLogger.logAuthentication(
        'USER_REGISTERED',
        result.user.id.toString(),
        {
          email: registerDto.email,
        },
      );

      return successResponse(result, 'User registered successfully');
    } catch (error) {
      this.appLogger.logAuthentication('REGISTRATION_FAILED', undefined, {
        email: registerDto.email,
        error: error.message,
      });

      throw error;
    }
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'User login',
    description: 'Authenticate user with email and password',
  })
  @ApiResponse({
    status: 200,
    description: 'User successfully authenticated',
    schema: {
      type: 'object',
      properties: {
        user: {
          type: 'object',
          properties: {
            id: { type: 'number', format: 'id' },
            email: { type: 'string', format: 'email' },
          },
        },
        access_token: { type: 'string' },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid input data',
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid email or password',
  })
  async login(@Body() loginDto: LoginDto) {

    try {
      const result = await this.authService.login(loginDto);

      this.appLogger.logAuthentication(
        'USER_LOGIN',
        result.user.id.toString(),
        {
          email: loginDto.email,
        },
      );

      return successResponse(result, 'User logged in successfully');
    } catch (error) {
      this.appLogger.logAuthentication('LOGIN_FAILED', undefined, {
        email: loginDto.email,
        error: error.message,
      });

      throw error;
    }
  }
}
