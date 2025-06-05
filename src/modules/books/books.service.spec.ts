import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, UpdateResult, DeleteResult } from 'typeorm';
import {
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { BooksService } from './books.service';
import { Book } from '../../entities/book.entity';
import { CreateBookDto } from './dto/create-book.dto';
import { UpdateBookDto } from './dto/update-book.dto';
import { MinioService } from '../../storage/minio.service';

describe('BooksService', () => {
  let service: BooksService;
  let repository: Repository<Book>;
  let minioService: MinioService;

  const userId = 1;
  const anotherUserId = 2;

  const mockBook = {
    id: 1,
    title: 'Test Book',
    author: 'Test Author',
    description: 'Test Description',
    year: 2024,
    coverImageUrl: null,
    userId,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  const mockBooks = [
    mockBook,
    {
      id: 2,
      title: 'Another Book',
      author: 'Another Author',
      description: 'Another Description',
      year: 2023,
      coverImageUrl: 'https://example.com/cover.jpg',
      userId,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    },
  ];

  const mockQueryBuilder = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    getMany: jest.fn(),
    getManyAndCount: jest.fn(),
    getOne: jest.fn(),
  };

  const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    softDelete: jest.fn(),
    restore: jest.fn(),
    count: jest.fn(),
    createQueryBuilder: jest.fn(() => mockQueryBuilder),
    findOneBy: jest.fn(),
    findAndCount: jest.fn(),
    metadata: {
      target: Book,
    },
  };

  const mockMinioService = {
    uploadFile: jest.fn(),
    deleteFile: jest.fn(),
    getPresignedUrl: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BooksService,
        {
          provide: getRepositoryToken(Book),
          useValue: mockRepository,
        },
        {
          provide: MinioService,
          useValue: mockMinioService,
        },
      ],
    }).compile();

    service = module.get<BooksService>(BooksService);
    repository = module.get<Repository<Book>>(getRepositoryToken(Book));
    minioService = module.get<MinioService>(MinioService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });


  describe('BaseService inherited methods', () => {
    describe('getById', () => {
      it('should return book by ID', async () => {
        mockRepository.findOneBy.mockResolvedValue(mockBook);

        const result = await service.getById(mockBook.id);

        expect(result).toEqual(mockBook);
        expect(mockRepository.findOneBy).toHaveBeenCalledWith({
          id: mockBook.id,
        });
      });

      it('should return null if book not found', async () => {
        mockRepository.findOneBy.mockResolvedValue(null);

        const result = await service.getById(10);

        expect(result).toBeNull();
      });

      it('should throw error on repository failure', async () => {
        mockRepository.findOneBy.mockRejectedValue(new Error('Database error'));

        await expect(service.getById(mockBook.id)).rejects.toThrow(
          'Service error in getById: Database error',
        );
      });
    });

    describe('getAll', () => {
      it('should return all books', async () => {
        mockRepository.find.mockResolvedValue(mockBooks);

        const result = await service.getAll();

        expect(result).toEqual(mockBooks);
        expect(mockRepository.find).toHaveBeenCalledWith(undefined);
      });

      it('should return books with options', async () => {
        const options = { where: { userId }, order: { createdAt: 'DESC' } };
        mockRepository.find.mockResolvedValue(mockBooks);

        const result = await service.getAll(options as any);

        expect(result).toEqual(mockBooks);
        expect(mockRepository.find).toHaveBeenCalledWith(options);
      });
    });

    describe('create', () => {
      const createData = {
        title: 'New Book',
        author: 'New Author',
        description: 'New Description',
        year: 2024,
        userId,
      };

      it('should create new book', async () => {
        mockRepository.create.mockReturnValue(mockBook);
        mockRepository.save.mockResolvedValue(mockBook);

        const result = await service.create(createData);

        expect(result).toEqual(mockBook);
        expect(mockRepository.create).toHaveBeenCalledWith(createData);
        expect(mockRepository.save).toHaveBeenCalledWith(mockBook);
      });

      it('should throw error on save failure', async () => {
        mockRepository.create.mockReturnValue(mockBook);
        mockRepository.save.mockRejectedValue(new Error('Database error'));

        await expect(service.create(createData)).rejects.toThrow(
          'Service error in create: Database error',
        );
      });
    });

    describe('update', () => {
      it('should update book', async () => {
        const updateResult: UpdateResult = {
          affected: 1,
          raw: {},
          generatedMaps: [],
        };
        mockRepository.update.mockResolvedValue(updateResult);

        const result = await service.update(mockBook.id, {
          title: 'Updated Title',
        });

        expect(result).toEqual(updateResult);
        expect(mockRepository.update).toHaveBeenCalledWith(mockBook.id, {
          title: 'Updated Title',
        });
      });
    });

    describe('delete', () => {
      it('should delete book', async () => {
        const deleteResult: DeleteResult = { affected: 1, raw: {} };
        mockRepository.delete.mockResolvedValue(deleteResult);

        const result = await service.delete(mockBook.id);

        expect(result).toEqual(deleteResult);
        expect(mockRepository.delete).toHaveBeenCalledWith(mockBook.id);
      });
    });

    describe('exists', () => {
      it('should return true if book exists', async () => {
        mockRepository.count.mockResolvedValue(1);

        const result = await service.exists('title', 'Test Book');

        expect(result).toBe(true);
        expect(mockRepository.count).toHaveBeenCalledWith({
          where: { title: 'Test Book' },
        });
      });

      it('should return false if book does not exist', async () => {
        mockRepository.count.mockResolvedValue(0);

        const result = await service.exists('title', 'Non-existent Book');

        expect(result).toBe(false);
      });
    });
  });



  describe('findByAuthor', () => {
    it('should find books by author', async () => {
      const authorBooks = mockBooks.filter((book) =>
        book.author.includes('Test'),
      );
      mockRepository.find.mockResolvedValue(authorBooks);

      const result = await service.findByAuthor('Test Author');

      expect(result).toEqual(authorBooks);
      expect(mockRepository.find).toHaveBeenCalledWith({
        where: { author: 'Test Author' },
      });
    });
  });

  describe('findByUser', () => {
    it('should find books by user ID', async () => {
      mockRepository.find.mockResolvedValue(mockBooks);

      const result = await service.findByUser(userId);

      expect(result).toEqual(mockBooks);
      expect(mockRepository.find).toHaveBeenCalledWith({
        where: { userId },
      });
    });
  });

  describe('findByYear', () => {
    it('should find books by year', async () => {
      const yearBooks = mockBooks.filter((book) => book.year === 2024);
      mockRepository.find.mockResolvedValue(yearBooks);

      const result = await service.findByYear(2024);

      expect(result).toEqual(yearBooks);
      expect(mockRepository.find).toHaveBeenCalledWith({
        where: { year: 2024 },
      });
    });
  });

  describe('searchByTitle', () => {
    it('should search books by title', async () => {
      mockQueryBuilder.getMany.mockResolvedValue(mockBooks);

      const result = await service.searchByTitle('Test');

      expect(result).toEqual(mockBooks);
      expect(mockRepository.createQueryBuilder).toHaveBeenCalledWith('book');
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'book.title ILIKE :title',
        {
          title: '%Test%',
        },
      );
    });

    it('should handle search error', async () => {
      mockQueryBuilder.getMany.mockRejectedValue(new Error('Database error'));

      await expect(service.searchByTitle('Test')).rejects.toThrow(
        'Service error in searchByTitle: Database error',
      );
    });
  });

  describe('searchByAuthor', () => {
    it('should search books by author', async () => {
      mockQueryBuilder.getMany.mockResolvedValue(mockBooks);

      const result = await service.searchByAuthor('Author');

      expect(result).toEqual(mockBooks);
      expect(mockRepository.createQueryBuilder).toHaveBeenCalledWith('book');
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'book.author ILIKE :author',
        {
          author: '%Author%',
        },
      );
    });
  });

  describe('getBooksWithUser', () => {
    it('should get books with user relations', async () => {
      const booksWithUser = mockBooks.map((book) => ({
        ...book,
        user: { id: userId },
      }));
      mockRepository.find.mockResolvedValue(booksWithUser);

      const result = await service.getBooksWithUser();

      expect(result).toEqual(booksWithUser);
      expect(mockRepository.find).toHaveBeenCalledWith({
        relations: ['user'],
      });
    });

    it('should get books with user relations and options', async () => {
      const options = { where: { year: 2024 } };
      const booksWithUser = mockBooks.map((book) => ({
        ...book,
        user: { id: userId },
      }));
      mockRepository.find.mockResolvedValue(booksWithUser);

      const result = await service.getBooksWithUser(options);

      expect(result).toEqual(booksWithUser);
      expect(mockRepository.find).toHaveBeenCalledWith({
        ...options,
        relations: ['user'],
      });
    });
  });

  describe('titleExists', () => {
    it('should return true if title exists', async () => {
      mockRepository.count.mockResolvedValue(1);

      const result = await service.titleExists('Test Book');

      expect(result).toBe(true);
    });

    it('should return false if title does not exist', async () => {
      mockRepository.count.mockResolvedValue(0);

      const result = await service.titleExists('Non-existent Book');

      expect(result).toBe(false);
    });
  });

  describe('countByUser', () => {
    it('should count books by user', async () => {
      mockRepository.count.mockResolvedValue(5);

      const result = await service.countByUser(userId);

      expect(result).toBe(5);
      expect(mockRepository.count).toHaveBeenCalledWith({
        where: { userId },
      });
    });
  });

  describe('findByAuthors', () => {
    it('should find books by multiple authors', async () => {
      const authors = ['Author 1', 'Author 2'];
      mockQueryBuilder.getMany.mockResolvedValue(mockBooks);

      const result = await service.findByAuthors(authors);

      expect(result).toEqual(mockBooks);
      expect(mockRepository.createQueryBuilder).toHaveBeenCalledWith('book');
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'book.author IN (:...authors)',
        {
          authors,
        },
      );
    });
  });

  describe('deleteAllByUser', () => {
    it('should delete all books by user', async () => {
      const deleteResult: DeleteResult = { affected: 3, raw: {} };
      mockRepository.delete.mockResolvedValue(deleteResult);

      const result = await service.deleteAllByUser(userId);

      expect(result).toEqual(deleteResult);
      expect(mockRepository.delete).toHaveBeenCalledWith({ userId });
    });
  });


  describe('findByIdAndUser', () => {
    it('should find book by ID and user', async () => {
      mockRepository.findOneBy.mockResolvedValue(mockBook);

      const result = await service.findByIdAndUser(mockBook.id, userId);

      expect(result).toEqual(mockBook);
      expect(mockRepository.findOneBy).toHaveBeenCalledWith({
        id: mockBook.id,
        userId,
      });
    });

    it('should return null if book belongs to different user', async () => {
      mockRepository.findOneBy.mockResolvedValue(null);

      const result = await service.findByIdAndUser(mockBook.id, anotherUserId);

      expect(result).toBeNull();
      expect(mockRepository.findOneBy).toHaveBeenCalledWith({
        id: mockBook.id,
        userId: anotherUserId,
      });
    });

    it('should handle database error', async () => {
      mockRepository.findOneBy.mockRejectedValue(new Error('Database error'));

      await expect(
        service.findByIdAndUser(mockBook.id, userId),
      ).rejects.toThrow('Service error in findByIdAndUser: Database error');
    });
  });

  describe('searchByTitleForUser', () => {
    it('should search books by title for specific user', async () => {
      mockQueryBuilder.getMany.mockResolvedValue(mockBooks);

      const result = await service.searchByTitleForUser(userId, 'Test');

      expect(result).toEqual(mockBooks);
      expect(mockRepository.createQueryBuilder).toHaveBeenCalledWith('book');
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'book.userId = :userId',
        { userId },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        '(book.title ILIKE :searchTerm OR book.author ILIKE :searchTerm)',
        {
          searchTerm: '%Test%',
        },
      );
    });
  });

  describe('findByAuthorForUser', () => {
    it('should find books by author for specific user', async () => {
      mockQueryBuilder.getMany.mockResolvedValue(mockBooks);

      const result = await service.findByAuthorForUser(userId, 'Author');

      expect(result).toEqual(mockBooks);
      expect(mockRepository.createQueryBuilder).toHaveBeenCalledWith('book');
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'book.userId = :userId',
        { userId },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'book.author ILIKE :author',
        {
          author: '%Author%',
        },
      );
    });
  });

  describe('titleExistsForUser', () => {
    it('should check if title exists for user', async () => {
      mockRepository.count.mockResolvedValue(1);

      const result = await service.titleExistsForUser(userId, 'Test Book');

      expect(result).toBe(true);
      expect(mockRepository.count).toHaveBeenCalledWith({
        where: { userId, title: 'Test Book' },
      });
    });

    it('should return false if title does not exist for user', async () => {
      mockRepository.count.mockResolvedValue(0);

      const result = await service.titleExistsForUser(
        userId,
        'Non-existent Book',
      );

      expect(result).toBe(false);
    });
  });


  describe('error handling', () => {
    it('should handle repository connection errors', async () => {
      mockRepository.findOneBy.mockRejectedValue(new Error('Connection lost'));

      await expect(service.getById(mockBook.id)).rejects.toThrow(
        'Service error in getById: Connection lost',
      );
    });

    it('should handle constraint violation errors', async () => {
      mockRepository.save.mockRejectedValue({ code: '23505' });

      const createData = {
        title: 'Test Book',
        author: 'Test Author',
        description: 'Test Description',
        year: 2024,
        userId,
      };

      await expect(service.create(createData)).rejects.toThrow(
        'Service error in create:',
      );
    });

    it('should handle query builder errors in search methods', async () => {
      mockQueryBuilder.getMany.mockRejectedValue(new Error('Query failed'));

      await expect(service.searchByTitle('Test')).rejects.toThrow(
        'Service error in searchByTitle: Query failed',
      );
    });
  });
});
