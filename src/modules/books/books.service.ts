import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindManyOptions } from 'typeorm';
import { Book } from '../../entities/book.entity';
import BaseService, {
  PaginationOptions,
  PaginatedResult,
} from '../BaseService';

@Injectable()
export class BooksService extends BaseService<Book> {
  constructor(
    @InjectRepository(Book)
    private readonly bookRepository: Repository<Book>,
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
    return this.count({ userId } as any);
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
}
