import { Injectable, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindManyOptions } from 'typeorm';
import { Book } from '../../entities/book.entity';
import BaseService, {
  PaginationOptions,
  PaginatedResult,
} from '../BaseService';
import { MinioService } from '../../storage/minio.service';
import { AppLoggerService } from '../../utils/nestjs-logger.service';
import { User } from '../../entities/user.entity';
import { CreateBookDto } from './dto/create-book.dto';
import { UpdateBookDto } from './dto/update-book.dto';


@Injectable()
export class BooksService extends BaseService<Book> {
  constructor(
    @InjectRepository(Book)
    private readonly bookRepository: Repository<Book>,
    private readonly minioService: MinioService,
    private readonly logger: AppLoggerService,
  ) {
    super(bookRepository);
  }

  // Simple delegate methods using base service
  async findByAuthor(author: string): Promise<Book[]> {
    return this.findByField('author', author);
  }

  async findByUser(userId: number): Promise<Book[]> {
    return this.findByField('userId', userId);
  }

  async findByYear(year: number): Promise<Book[]> {
    return this.findByField('year', year);
  }

  async titleExists(title: string): Promise<boolean> {
    return this.exists('title', title);
  }

  async countByUser(userId: number): Promise<number> {
    return this.count({ userId });
  }

  async deleteAllByUser(userId: number): Promise<any> {
    return this.deleteByField('userId', userId);
  }

  // More complex queries that require custom implementation
  async searchByTitle(title: string): Promise<Book[]> {
    try {
      return await this.bookRepository
        .createQueryBuilder('book')
        .where('book.title ILIKE :title', { title: `%${title}%` })
        .getMany();
    } catch (error) {
      this.handleError('searchByTitle', error);
    }
  }

  async searchByAuthor(author: string): Promise<Book[]> {
    try {
      return await this.bookRepository
        .createQueryBuilder('book')
        .where('book.author ILIKE :author', { author: `%${author}%` })
        .getMany();
    } catch (error) {
      this.handleError('searchByAuthor', error);
    }
  }

  async getBooksWithUser(options?: FindManyOptions<Book>): Promise<Book[]> {
    try {
      return await this.bookRepository.find({
        ...options,
        relations: ['user'],
      });
    } catch (error) {
      this.handleError('getBooksWithUser', error);
    }
  }

  async findByAuthors(authors: string[]): Promise<Book[]> {
    try {
      if (!authors.length) return [];
      return await this.bookRepository
        .createQueryBuilder('book')
        .where('book.author IN (:...authors)', { authors })
        .getMany();
    } catch (error) {
      this.handleError('findByAuthors', error);
    }
  }

  async findByIdAndUser(bookId: number, userId: number): Promise<Book | null> {
    try {
      return await this.bookRepository.findOneBy({
        id: bookId,
        userId: userId,
      });
    } catch (error) {
      this.handleError('findByIdAndUser', error);
    }
  }

  async searchByTitleForUser(
    userId: number,
    searchTerm: string,
  ): Promise<Book[]> {
    try {
      return await this.bookRepository
        .createQueryBuilder('book')
        .where('book.userId = :userId', { userId })
        .andWhere(
          '(book.title ILIKE :searchTerm OR book.author ILIKE :searchTerm)',
          {
            searchTerm: `%${searchTerm}%`,
          },
        )
        .getMany();
    } catch (error) {
      this.handleError('searchByTitleForUser', error);
    }
  }

  async findByAuthorForUser(userId: number, author: string): Promise<Book[]> {
    try {
      return await this.bookRepository
        .createQueryBuilder('book')
        .where('book.userId = :userId', { userId })
        .andWhere('book.author ILIKE :author', { author: `%${author}%` })
        .getMany();
    } catch (error) {
      this.handleError('findByAuthorForUser', error);
    }
  }

  async getPaginatedByUser(
    userId: number,
    options: PaginationOptions,
    findOptions?: Omit<FindManyOptions<Book>, 'take' | 'skip' | 'where'>,
  ): Promise<PaginatedResult<Book>> {
    const whereOptions = {
      ...findOptions,
      where: { userId },
    };
    return this.getPaginated(options, whereOptions);
  }

  async findByYearForUser(userId: number, year: number): Promise<Book[]> {
    try {
      return await this.bookRepository.findBy({
        userId,
        year,
      });
    } catch (error) {
      this.handleError('findByYearForUser', error);
    }
  }

  async titleExistsForUser(userId: number, title: string): Promise<boolean> {
    try {
      const count = await this.bookRepository.count({
        where: { userId, title },
      });
      return count > 0;
    } catch (error) {
      this.handleError('titleExistsForUser', error);
    }
  }

  /**
   * Create a book that belongs to a specific user.
   * Performs duplicate-title validation and (optional) cover-image upload.
   */
  async createBookForUser(
    user: User,
    dto: CreateBookDto,
    coverImage?: Express.Multer.File,
  ): Promise<Book> {
    // Check for duplicate title
    const titleExists = await this.titleExistsForUser(user.id, dto.title);
    if (titleExists) {
      throw new ConflictException(
        `You already have a book with the title "${dto.title}". Please use a different title.`,
      );
    }

    // Handle optional cover image
    let coverImageUrl: string | undefined;
    if (coverImage) {
      coverImageUrl = await this.uploadCoverImage(coverImage, user);
    }

    const created = await this.create({
      ...dto,
      userId: user.id,
      coverImageUrl,
    });

    this.logger.debug(
      `Book created – id: ${created.id}, user: ${user.id}, title: ${created.title}`,
    );
    return created;
  }

  /**
   * Update an existing book that belongs to a user.
   */
  async updateBookForUser(
    user: User,
    id: number,
    dto: UpdateBookDto,
  ): Promise<Book> {
    const existing = await this.findByIdAndUser(id, user.id);
    if (!existing) {
      throw new NotFoundException('Book not found');
    }

    // Duplicate-title guard
    if (dto.title && dto.title !== existing.title) {
      const titleExists = await this.titleExistsForUser(user.id, dto.title);
      if (titleExists) {
        throw new ConflictException(
          `You already have a book with the title "${dto.title}". Please use a different title.`,
        );
      }
    }

    // Update directly; DTO doesn't expose userId so no risk of ownership change
    await this.update(id, dto);
    const updated = await this.findByIdAndUser(id, user.id);
    return updated as Book;
  }

  /**
   * Delete a book (and its cover image if present) that belongs to a user.
   */
  async deleteBookForUser(user: User, id: number): Promise<void> {
    const book = await this.findByIdAndUser(id, user.id);
    if (!book) {
      throw new NotFoundException('Book not found');
    }

    if (book.coverImageUrl) {
      try {
        const parts = book.coverImageUrl.split('/');
        const fileName = parts[parts.length - 1];
        if (fileName) {
          await this.minioService.deleteFile(`covers/${user.id}/${fileName}`);
        }
      } catch (err) {
        // Log & continue – we don't want book deletion to fail due to image cleanup.
        this.logger.warn(`Failed to delete cover image for book ${id}: ${err}`);
      }
    }

    await this.delete(id);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Helpers
  // ──────────────────────────────────────────────────────────────────────────

  private async uploadCoverImage(
    coverImage: Express.Multer.File,
    user: User,
  ): Promise<string> {
    // Validate MIME type
    const allowed = ['image/jpeg', 'image/jpg', 'image/png'];
    if (!allowed.includes(coverImage.mimetype)) {
      throw new BadRequestException(
        'Invalid file type. Only JPEG and PNG images are allowed.',
      );
    }

    // Validate size (3 MB)
    const max = 3 * 1024 * 1024;
    if (coverImage.size > max) {
      throw new BadRequestException('File too large. Maximum size is 3MB.');
    }

    const uploadResult = await this.minioService.uploadFile(
      coverImage.buffer,
      coverImage.originalname,
      {
        fileName: `covers/${user.id}/${Date.now()}-${coverImage.originalname}`,
        contentType: coverImage.mimetype,
        metadata: { userId: user.id, uploadedAt: new Date().toISOString() },
      },
    );

    return uploadResult.url;
  }
}
