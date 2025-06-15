import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpStatus,
  UsePipes,
  ValidationPipe,
  UseInterceptors,
  UploadedFile,
  Logger,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { BooksService } from './books.service';
import { PaginationOptions } from '../BaseService';
import { CreateBookDto } from './dto/create-book.dto';
import { UpdateBookDto } from './dto/update-book.dto';
import { BookQueryDto } from './dto/book-query.dto';
import { CurrentUser } from '../auth/decorators/user.decorator';
import { User } from '../../entities/user.entity';
import { AppLoggerService } from '../../utils/nestjs-logger.service';
import {
  successResponse,
  successResponseWithPagination,
  throwErrorResponse,
} from '../../utils/response.helper';

@ApiTags('Books')
@Controller('api/v1/books')
@ApiBearerAuth()
export class BooksController {
  private readonly logger = new Logger(BooksController.name);

  constructor(
    private readonly booksService: BooksService,
    private readonly appLogger: AppLoggerService,
  ) {}

  /**
   * Get all books for the authenticated user with pagination and filtering
   */
  @Get()
  @ApiOperation({
    summary: "Get user's books",
    description:
      'Get all books belonging to the authenticated user with optional filtering and pagination',
  })
  @ApiResponse({
    status: 200,
    description: 'Books retrieved successfully',
  })
  @ApiUnauthorizedResponse({
    description: 'Authentication required',
  })
  async getAllBooks(
    @CurrentUser() user: User,
    @Query(new ValidationPipe({ transform: true, whitelist: true }))
    query: BookQueryDto,
  ) {
    this.appLogger.debug(
      `User ${user.id} (${user.email}) requesting books - Page: ${query.page || 1}, Limit: ${query.limit || 10}, Search: ${query.search || 'none'}`,
    );

    const { page = 1, limit = 10, sortBy, sortOrder, author, search } = query;

    if (search) {
      const books = await this.booksService.searchByTitleForUser(
        user.id,
        search,
      );
      return successResponse(books, 'Books retrieved successfully');
    }

    if (author) {
      const books = await this.booksService.findByAuthorForUser(
        user.id,
        author,
      );
      return successResponse(books, 'Books by author retrieved successfully');
    }

    const paginationOptions: PaginationOptions = {
      page: Number(page),
      limit: Number(limit),
      sortBy,
      sortOrder,
    };

    const result = await this.booksService.getPaginatedByUser(
      user.id,
      paginationOptions,
    );
    return successResponseWithPagination(
      result.data,
      result.pagination,
      'Books retrieved successfully',
    );
  }

  /**
   * Get a specific book by ID (only if it belongs to the authenticated user)
   */
  @Get(':id')
  @ApiOperation({
    summary: 'Get book by ID',
    description:
      'Get a specific book by ID if it belongs to the authenticated user',
  })
  @ApiResponse({
    status: 200,
    description: 'Book retrieved successfully',
  })
  @ApiUnauthorizedResponse({
    description: 'Authentication required',
  })
  @ApiForbiddenResponse({
    description: 'Book does not belong to the authenticated user',
  })
  async getBookById(@CurrentUser() user: User, @Param('id') id: number) {
    const book = await this.booksService.findByIdAndUser(id, user.id);

    if (!book) {
      throwErrorResponse('Book not found', HttpStatus.NOT_FOUND);
    }

    return successResponse(book, 'Book retrieved successfully');
  }

  /**
   * Create a new book for the authenticated user with optional cover image upload
   */
  @Post()
  @UseInterceptors(FileInterceptor('coverImage'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Create a new book',
    description:
      'Create a new book for the authenticated user with optional cover image upload',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: 'Book title',
          example: 'The Great Gatsby',
        },
        author: {
          type: 'string',
          description: 'Book author',
          example: 'F. Scott Fitzgerald',
        },
        description: {
          type: 'string',
          description: 'Book description (optional)',
          example: 'A classic novel about the Jazz Age',
        },
        year: {
          type: 'number',
          description: 'Publication year (optional)',
          example: 1925,
        },
        coverImage: {
          type: 'string',
          format: 'binary',
          description: 'Cover image file (optional)',
        },
      },
      required: ['title', 'author'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Book created successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            id: { type: 'number', example: 'id' },
            title: { type: 'string', example: 'The Great Gatsby' },
            author: { type: 'string', example: 'F. Scott Fitzgerald' },
            description: { type: 'string', example: 'A classic novel...' },
            year: { type: 'number', example: 1925 },
            coverImageUrl: {
              type: 'string',
              example: 'https://minio.example.com/...',
            },
            userId: { type: 'number', example: 'id' },
            createdAt: { type: 'string', example: '2024-01-01T00:00:00.000Z' },
            updatedAt: { type: 'string', example: '2024-01-01T00:00:00.000Z' },
          },
        },
        message: { type: 'string', example: 'Book created successfully' },
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Authentication required',
  })
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async createBook(
    @CurrentUser() user: User,
    @Body() createBookDto: CreateBookDto,
    @UploadedFile() coverImage?: Express.Multer.File,
  ) {
    this.appLogger.debug(
      `User ${user.id} (${user.email}) creating book: "${createBookDto.title}" by ${createBookDto.author}${coverImage ? ' with cover image' : ''}`,
    );

    const book = await this.booksService.createBookForUser(
      user,
      createBookDto,
      coverImage,
    );
    return successResponse(book, 'Book created successfully');
  }

  /**
   * Update a book (only if it belongs to the authenticated user)
   */
  @Put(':id')
  @ApiOperation({
    summary: 'Update a book',
    description: 'Update a book if it belongs to the authenticated user',
  })
  @ApiResponse({
    status: 200,
    description: 'Book updated successfully',
  })
  @ApiUnauthorizedResponse({
    description: 'Authentication required',
  })
  @ApiForbiddenResponse({
    description: 'Book does not belong to the authenticated user',
  })
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async updateBook(
    @CurrentUser() user: User,
    @Param('id') id: number,
    @Body() updateBookDto: UpdateBookDto,
  ) {
    const updatedBook = await this.booksService.updateBookForUser(
      user,
      +id,
      updateBookDto,
    );
    return successResponse(updatedBook, 'Book updated successfully');
  }

  /**
   * Delete a book (only if it belongs to the authenticated user)
   */
  @Delete(':id')
  @ApiOperation({
    summary: 'Delete a book',
    description: 'Delete a book if it belongs to the authenticated user',
  })
  @ApiResponse({
    status: 200,
    description: 'Book deleted successfully',
  })
  @ApiUnauthorizedResponse({
    description: 'Authentication required',
  })
  @ApiForbiddenResponse({
    description: 'Book does not belong to the authenticated user',
  })
  async deleteBook(@CurrentUser() user: User, @Param('id') id: number) {
    await this.booksService.deleteBookForUser(user, +id);
    return successResponse(null, 'Book deleted successfully');
  }
}
