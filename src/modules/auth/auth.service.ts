import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User } from '../../entities/user.entity';
import { RegisterDto, LoginDto } from './dto';
import BaseService from '../BaseService';

export interface JwtPayload {
  sub: number;
  email: string;
  iat?: number;
  exp?: number;
}

export interface AuthResponse {
  user: {
    id: number;
    email: string;
  };
  access_token: string;
}

@Injectable()
export class AuthService extends BaseService<User> {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
  ) {
    super(userRepository);
  }

  async register(registerDto: RegisterDto): Promise<AuthResponse> {
    const { email, password } = registerDto;

    // Check if user already exists using BaseService method
    const existingUser = await this.exists('email', email.toLowerCase());
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    try {
      // Use BaseService create method
      const savedUser = await this.create({
        email: email.toLowerCase(),
        password: hashedPassword,
      });

      // Generate JWT token
      const payload: JwtPayload = {
        sub: savedUser.id,
        email: savedUser.email,
      };

      const access_token = this.jwtService.sign(payload);

      return {
        user: {
          id: savedUser.id,
          email: savedUser.email,
        },
        access_token,
      };
    } catch (error) {
      if (error.code === '23505') {
        // PostgreSQL unique constraint violation
        throw new ConflictException('User with this email already exists');
      }
      throw new BadRequestException('Failed to create user');
    }
  }

  async login(loginDto: LoginDto): Promise<AuthResponse> {
    const { email, password } = loginDto;

    // Find user by email using BaseService method
    const users = await this.findByField('email', email.toLowerCase());
    if (users.length === 0) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Get user with password (since it's excluded by default)
    const user = await this.userRepository.findOne({
      where: { email: email.toLowerCase() },
      select: ['id', 'email', 'password'],
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Generate JWT token
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
    };

    const access_token = this.jwtService.sign(payload);

    return {
      user: {
        id: user.id,
        email: user.email,
      },
      access_token,
    };
  }

  async validateUser(payload: JwtPayload): Promise<User | null> {
    // Use BaseService getById method
    return await this.getById(payload.sub);
  }

  /**
   * Find user by email
   * @param email - The email to search for
   * @returns Promise<User | null>
   */
  async findUserByEmail(email: string): Promise<User | null> {
    try {
      const users = await this.findByField('email', email.toLowerCase());
      return users.length > 0 ? users[0] : null;
    } catch (error) {
      throw new Error(
        `Error finding user by email: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Check if email exists
   * @param email - The email to check
   * @returns Promise<boolean>
   */
  async emailExists(email: string): Promise<boolean> {
    return await this.exists('email', email.toLowerCase());
  }
}
