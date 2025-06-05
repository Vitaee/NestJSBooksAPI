import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, UpdateResult, DeleteResult } from 'typeorm';
import {
  ConflictException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { AuthService, JwtPayload, AuthResponse } from './auth.service';
import { User } from '../../entities/user.entity';
import { RegisterDto, LoginDto } from './dto';

describe('AuthService', () => {
  let service: AuthService;
  let userRepository: Repository<User>;
  let jwtService: JwtService;

  const mockUser = {
    id: 1,
    email: 'test@example.com',
    password: '$2a$12$hashedPassword',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  const mockUsers = [
    mockUser,
    {
      id: 2,
      email: 'user2@example.com',
      password: '$2a$12$anotherHashedPassword',
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    },
  ];

  const mockUserRepository = {
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    softDelete: jest.fn(),
    restore: jest.fn(),
    count: jest.fn(),
    createQueryBuilder: jest.fn(),
    findOneBy: jest.fn(),
    findAndCount: jest.fn(),
    metadata: {
      target: User,
    },
  };

  const mockJwtService = {
    sign: jest.fn(() => 'jwt-token'),
    verify: jest.fn(),
    decode: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    jwtService = module.get<JwtService>(JwtService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });


  describe('BaseService inherited methods', () => {
    describe('getById', () => {
      it('should return user by ID', async () => {
        mockUserRepository.findOneBy.mockResolvedValue(mockUser);

        const result = await service.getById(mockUser.id);

        expect(result).toEqual(mockUser);
        expect(mockUserRepository.findOneBy).toHaveBeenCalledWith({
          id: mockUser.id,
        });
      });

      it('should return null if user not found', async () => {
        mockUserRepository.findOneBy.mockResolvedValue(null);

        const result = await service.getById(10);

        expect(result).toBeNull();
      });

      it('should throw error on repository failure', async () => {
        mockUserRepository.findOneBy.mockRejectedValue(
          new Error('Database error'),
        );

        await expect(service.getById(mockUser.id)).rejects.toThrow(
          'Service error in getById: Database error',
        );
      });
    });

    describe('getAll', () => {
      it('should return all users', async () => {
        mockUserRepository.find.mockResolvedValue(mockUsers);

        const result = await service.getAll();

        expect(result).toEqual(mockUsers);
        expect(mockUserRepository.find).toHaveBeenCalledWith(undefined);
      });

      it('should return users with options', async () => {
        const options = {
          where: { email: 'test@example.com' },
          order: { createdAt: 'DESC' },
        };
        mockUserRepository.find.mockResolvedValue([mockUser]);

        const result = await service.getAll(options as any);

        expect(result).toEqual([mockUser]);
        expect(mockUserRepository.find).toHaveBeenCalledWith(options);
      });
    });

    describe('create', () => {
      const createData = {
        email: 'newuser@example.com',
        password: 'hashedPassword123',
      };

      it('should create new user', async () => {
        mockUserRepository.create.mockReturnValue(mockUser);
        mockUserRepository.save.mockResolvedValue(mockUser);

        const result = await service.create(createData);

        expect(result).toEqual(mockUser);
        expect(mockUserRepository.create).toHaveBeenCalledWith(createData);
        expect(mockUserRepository.save).toHaveBeenCalledWith(mockUser);
      });

      it('should throw error on save failure', async () => {
        mockUserRepository.create.mockReturnValue(mockUser);
        mockUserRepository.save.mockRejectedValue(new Error('Database error'));

        await expect(service.create(createData)).rejects.toThrow(
          'Service error in create: Database error',
        );
      });
    });

    describe('update', () => {
      it('should update user', async () => {
        const updateResult: UpdateResult = {
          affected: 1,
          raw: {},
          generatedMaps: [],
        };
        mockUserRepository.update.mockResolvedValue(updateResult);

        const result = await service.update(mockUser.id, {
          email: 'updated@example.com',
        });

        expect(result).toEqual(updateResult);
        expect(mockUserRepository.update).toHaveBeenCalledWith(mockUser.id, {
          email: 'updated@example.com',
        });
      });
    });

    describe('delete', () => {
      it('should delete user', async () => {
        const deleteResult: DeleteResult = { affected: 1, raw: {} };
        mockUserRepository.delete.mockResolvedValue(deleteResult);

        const result = await service.delete(mockUser.id);

        expect(result).toEqual(deleteResult);
        expect(mockUserRepository.delete).toHaveBeenCalledWith(mockUser.id);
      });
    });

    describe('exists', () => {
      it('should return true if user exists', async () => {
        mockUserRepository.count.mockResolvedValue(1);

        const result = await service.exists('email', 'test@example.com');

        expect(result).toBe(true);
        expect(mockUserRepository.count).toHaveBeenCalledWith({
          where: { email: 'test@example.com' },
        });
      });

      it('should return false if user does not exist', async () => {
        mockUserRepository.count.mockResolvedValue(0);

        const result = await service.exists('email', 'nonexistent@example.com');

        expect(result).toBe(false);
      });
    });
  });


  describe('register', () => {
    const registerDto: RegisterDto = {
      email: 'test@example.com',
      password: 'password123',
    };

    beforeEach(() => {
      jest
        .spyOn(bcrypt, 'hash')
        .mockImplementation(async () => '$2a$12$hashedPassword');
    });

    it('should register a new user successfully', async () => {
      mockUserRepository.count.mockResolvedValue(0); // User doesn't exist
      mockUserRepository.create.mockReturnValue(mockUser);
      mockUserRepository.save.mockResolvedValue(mockUser);

      const result = await service.register(registerDto);

      expect(result).toEqual({
        user: {
          id: mockUser.id,
          email: mockUser.email,
        },
        access_token: 'jwt-token',
      });

      expect(mockUserRepository.count).toHaveBeenCalledWith({
        where: { email: registerDto.email.toLowerCase() },
      });
      expect(bcrypt.hash).toHaveBeenCalledWith(registerDto.password, 12);
      expect(mockUserRepository.save).toHaveBeenCalled();
      expect(jwtService.sign).toHaveBeenCalledWith({
        sub: mockUser.id,
        email: mockUser.email,
      });
    });

    it('should throw BadRequestException for other database errors', async () => {
      mockUserRepository.count.mockResolvedValue(0);
      mockUserRepository.create.mockReturnValue(mockUser);
      mockUserRepository.save.mockRejectedValue(
        new Error('Unknown database error'),
      );

      await expect(service.register(registerDto)).rejects.toThrow(
        new BadRequestException('Failed to create user'),
      );
    });

    it('should handle email normalization', async () => {
      const registerDtoUpperCase = {
        email: 'TEST@EXAMPLE.COM',
        password: 'password123',
      };

      mockUserRepository.count.mockResolvedValue(0);
      mockUserRepository.create.mockReturnValue(mockUser);
      mockUserRepository.save.mockResolvedValue(mockUser);

      await service.register(registerDtoUpperCase);

      expect(mockUserRepository.count).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
    });

    it('should use proper salt rounds for password hashing', async () => {
      mockUserRepository.count.mockResolvedValue(0);
      mockUserRepository.create.mockReturnValue(mockUser);
      mockUserRepository.save.mockResolvedValue(mockUser);

      await service.register(registerDto);

      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 12);
    });
  });

  describe('login', () => {
    const loginDto: LoginDto = {
      email: 'test@example.com',
      password: 'password123',
    };

    beforeEach(() => {
      jest.spyOn(bcrypt, 'compare').mockImplementation(async () => true);
    });

    it('should login user successfully', async () => {
      mockUserRepository.find.mockResolvedValue([mockUser]);
      mockUserRepository.findOne.mockResolvedValue({
        ...mockUser,
        password: '$2a$12$hashedPassword',
      });

      const result = await service.login(loginDto);

      expect(result).toEqual({
        user: {
          id: mockUser.id,
          email: mockUser.email,
        },
        access_token: 'jwt-token',
      });

      expect(mockUserRepository.find).toHaveBeenCalledWith({
        where: { email: loginDto.email.toLowerCase() },
      });
      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { email: loginDto.email.toLowerCase() },
        select: ['id', 'email', 'password'],
      });
      expect(bcrypt.compare).toHaveBeenCalledWith(
        loginDto.password,
        '$2a$12$hashedPassword',
      );
      expect(jwtService.sign).toHaveBeenCalledWith({
        sub: mockUser.id,
        email: mockUser.email,
      });
    });

    it('should throw UnauthorizedException for invalid email (no users found)', async () => {
      mockUserRepository.find.mockResolvedValue([]);

      await expect(service.login(loginDto)).rejects.toThrow(
        new UnauthorizedException('Invalid email or password'),
      );
    });

    it('should throw UnauthorizedException for invalid email (user not found in second query)', async () => {
      mockUserRepository.find.mockResolvedValue([mockUser]);
      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(
        new UnauthorizedException('Invalid email or password'),
      );
    });

    it('should throw UnauthorizedException for invalid password', async () => {
      mockUserRepository.find.mockResolvedValue([mockUser]);
      mockUserRepository.findOne.mockResolvedValue({
        ...mockUser,
        password: '$2a$12$hashedPassword',
      });
      jest.spyOn(bcrypt, 'compare').mockImplementation(async () => false);

      await expect(service.login(loginDto)).rejects.toThrow(
        new UnauthorizedException('Invalid email or password'),
      );
    });

    it('should handle email normalization', async () => {
      const loginDtoUpperCase = {
        email: 'TEST@EXAMPLE.COM',
        password: 'password123',
      };

      mockUserRepository.find.mockResolvedValue([mockUser]);
      mockUserRepository.findOne.mockResolvedValue({
        ...mockUser,
        password: '$2a$12$hashedPassword',
      });

      await service.login(loginDtoUpperCase);

      expect(mockUserRepository.find).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
        select: ['id', 'email', 'password'],
      });
    });

    it('should handle bcrypt comparison errors', async () => {
      mockUserRepository.find.mockResolvedValue([mockUser]);
      mockUserRepository.findOne.mockResolvedValue({
        ...mockUser,
        password: '$2a$12$hashedPassword',
      });
      jest.spyOn(bcrypt, 'compare').mockImplementation(async () => {
        throw new Error('Bcrypt error');
      });

      await expect(service.login(loginDto)).rejects.toThrow('Bcrypt error');
    });
  });

  describe('validateUser', () => {
    it('should return user if found', async () => {
      mockUserRepository.findOneBy.mockResolvedValue(mockUser);

      const payload: JwtPayload = {
        sub: mockUser.id,
        email: mockUser.email,
      };

      const result = await service.validateUser(payload);

      expect(result).toEqual(mockUser);
      expect(mockUserRepository.findOneBy).toHaveBeenCalledWith({
        id: mockUser.id,
      });
    });

    it('should return null if user not found', async () => {
      mockUserRepository.findOneBy.mockResolvedValue(null);

      const payload: JwtPayload = {
        sub: 10,
        email: 'invalid@example.com',
      };

      const result = await service.validateUser(payload);

      expect(result).toBeNull();
    });

    it('should handle payload with additional fields', async () => {
      mockUserRepository.findOneBy.mockResolvedValue(mockUser);

      const payload: JwtPayload = {
        sub: mockUser.id,
        email: mockUser.email,
        iat: 1234567890,
        exp: 1234567890,
      };

      const result = await service.validateUser(payload);

      expect(result).toEqual(mockUser);
    });
  });



  describe('findUserByEmail', () => {
    it('should find user by email', async () => {
      mockUserRepository.find.mockResolvedValue([mockUser]);

      const result = await service.findUserByEmail('test@example.com');

      expect(result).toEqual(mockUser);
      expect(mockUserRepository.find).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
    });

    it('should return null if no user found', async () => {
      mockUserRepository.find.mockResolvedValue([]);

      const result = await service.findUserByEmail('nonexistent@example.com');

      expect(result).toBeNull();
    });

    it('should return first user if multiple found', async () => {
      mockUserRepository.find.mockResolvedValue(mockUsers);

      const result = await service.findUserByEmail('test@example.com');

      expect(result).toEqual(mockUser);
    });

    it('should handle email normalization', async () => {
      mockUserRepository.find.mockResolvedValue([mockUser]);

      await service.findUserByEmail('TEST@EXAMPLE.COM');

      expect(mockUserRepository.find).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
    });
  });

  describe('emailExists', () => {
    it('should return true if email exists', async () => {
      mockUserRepository.count.mockResolvedValue(1);

      const result = await service.emailExists('test@example.com');

      expect(result).toBe(true);
      expect(mockUserRepository.count).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
    });

    it('should return false if email does not exist', async () => {
      mockUserRepository.count.mockResolvedValue(0);

      const result = await service.emailExists('nonexistent@example.com');

      expect(result).toBe(false);
    });

    it('should handle email normalization', async () => {
      mockUserRepository.count.mockResolvedValue(1);

      await service.emailExists('TEST@EXAMPLE.COM');

      expect(mockUserRepository.count).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
    });
  });



  describe('JWT token generation', () => {
    it('should generate valid JWT payload structure', async () => {
      mockUserRepository.count.mockResolvedValue(0);
      mockUserRepository.create.mockReturnValue(mockUser);
      mockUserRepository.save.mockResolvedValue(mockUser);
      jest
        .spyOn(bcrypt, 'hash')
        .mockImplementation(async () => '$2a$12$hashedPassword');

      const registerDto: RegisterDto = {
        email: 'test@example.com',
        password: 'password123',
      };

      await service.register(registerDto);

      expect(jwtService.sign).toHaveBeenCalledWith({
        sub: mockUser.id,
        email: mockUser.email,
      });
    });

    it('should return consistent token format', async () => {
      mockUserRepository.count.mockResolvedValue(0);
      mockUserRepository.create.mockReturnValue(mockUser);
      mockUserRepository.save.mockResolvedValue(mockUser);
      jest
        .spyOn(bcrypt, 'hash')
        .mockImplementation(async () => '$2a$12$hashedPassword');

      const registerDto: RegisterDto = {
        email: 'test@example.com',
        password: 'password123',
      };

      const result = await service.register(registerDto);

      expect(result).toHaveProperty('access_token');
      expect(result).toHaveProperty('user');
      expect(result.user).toHaveProperty('id');
      expect(result.user).toHaveProperty('email');
      expect(result.user).not.toHaveProperty('password');
    });
  });



  describe('error handling', () => {
    it('should handle repository connection errors in getById', async () => {
      mockUserRepository.findOneBy.mockRejectedValue(
        new Error('Connection lost'),
      );

      await expect(service.getById(mockUser.id)).rejects.toThrow(
        'Service error in getById: Connection lost',
      );
    });

    it('should handle repository connection errors in create', async () => {
      mockUserRepository.create.mockReturnValue(mockUser);
      mockUserRepository.save.mockRejectedValue(new Error('Connection lost'));

      const createData = {
        email: 'test@example.com',
        password: 'hashedPassword',
      };

      await expect(service.create(createData)).rejects.toThrow(
        'Service error in create: Connection lost',
      );
    });

    it('should handle invalid JWT payload gracefully', async () => {
      mockUserRepository.findOneBy.mockResolvedValue(null);

      const invalidPayload = {
        sub: 0,
        email: '',
      };

      const result = await service.validateUser(invalidPayload);

      expect(result).toBeNull();
    });
  });


  describe('security considerations', () => {
    it('should not expose password in response', async () => {
      mockUserRepository.count.mockResolvedValue(0);
      mockUserRepository.create.mockReturnValue(mockUser);
      mockUserRepository.save.mockResolvedValue(mockUser);
      jest
        .spyOn(bcrypt, 'hash')
        .mockImplementation(async () => '$2a$12$hashedPassword');

      const registerDto: RegisterDto = {
        email: 'test@example.com',
        password: 'password123',
      };

      const result = await service.register(registerDto);

      expect(result.user).not.toHaveProperty('password');
      expect(result.user.email).toBe(mockUser.email);
      expect(result.user.id).toBe(mockUser.id);
    });

    it('should always normalize email addresses', async () => {
      const variations = [
        'TEST@EXAMPLE.COM',
        'Test@Example.Com',
        'test@EXAMPLE.com',
        'TeSt@ExAmPlE.CoM',
      ];

      for (const email of variations) {
        mockUserRepository.count.mockResolvedValue(0);
        await service.emailExists(email);
        expect(mockUserRepository.count).toHaveBeenCalledWith({
          where: { email: 'test@example.com' },
        });
        jest.clearAllMocks();
      }
    });

    it('should use consistent error messages for invalid credentials', async () => {
      const errorMessage = 'Invalid email or password';

      // Test invalid email
      mockUserRepository.find.mockResolvedValue([]);
      await expect(
        service.login({ email: 'invalid@example.com', password: 'test' }),
      ).rejects.toThrow(errorMessage);

      // Test invalid password
      mockUserRepository.find.mockResolvedValue([mockUser]);
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      jest.spyOn(bcrypt, 'compare').mockImplementation(async () => false);
      await expect(
        service.login({ email: 'test@example.com', password: 'wrong' }),
      ).rejects.toThrow(errorMessage);
    });
  });
});
