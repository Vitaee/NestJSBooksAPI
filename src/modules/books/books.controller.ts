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
  HttpException,
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
import { MinioService } from '../../storage/minio.service';
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
    private readonly minioService: MinioService,
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

    try {
      const { page = 1, limit = 10, sortBy, sortOrder, author, search } = query;

      // If search query is provided, search within user's books
      if (search) {
        const books = await this.booksService.searchByTitleForUser(
          user.id,
          search,
        );
        return successResponse(books, 'Books retrieved successfully');
      }

      // If author filter is provided, filter within user's books
      if (author) {
        const books = await this.booksService.findByAuthorForUser(
          user.id,
          author,
        );
        return successResponse(books, 'Books by author retrieved successfully');
      }

      // Default pagination for user's books
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
    } catch (error) {
      throwErrorResponse(
        error instanceof Error ? error.message : 'Unknown error occurred',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
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
    try {
      const book = await this.booksService.findByIdAndUser(id, user.id);

      if (!book) {
        throwErrorResponse('Book not found', HttpStatus.NOT_FOUND);
      }

      return successResponse(book, 'Book retrieved successfully');
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throwErrorResponse(
        error instanceof Error ? error.message : 'Unknown error occurred',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
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

    try {
      // Check if a book with the same title already exists for this user
      const titleExists = await this.booksService.titleExistsForUser(
        user.id,
        createBookDto.title,
      );
      if (titleExists) {
        throwErrorResponse(
          `You already have a book with the title "${createBookDto.title}". Please use a different title.`,
          HttpStatus.CONFLICT,
        );
      }

      let coverImageUrl: string | undefined;

      // Upload cover image if provided
      if (coverImage) {
        coverImageUrl = await this.uploadCoverImage(coverImage, user);
      }

      // Create book data with automatically set userId and optional coverImageUrl
      const bookData = {
        ...createBookDto,
        userId: user.id,
        coverImageUrl,
      };

      const book = await this.booksService.create(bookData);
      return successResponse(book, 'Book created successfully');
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      // Handle database constraint violation for duplicate titles
      if (
        error.code === '23505' &&
        error.constraint &&
        error.constraint.includes('userId') &&
        error.constraint.includes('title')
      ) {
        throwErrorResponse(
          `You already have a book with the title "${createBookDto.title}". Please use a different title.`,
          HttpStatus.CONFLICT,
        );
      }

      throwErrorResponse(
        error instanceof Error ? error.message : 'Unknown error occurred',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
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
    try {
      // Check if book exists and belongs to user
      const existingBook = await this.booksService.findByIdAndUser(id, user.id);
      if (!existingBook) {
        throwErrorResponse('Book not found', HttpStatus.NOT_FOUND);
      }

      // Check if the new title conflicts with existing books (if title is being updated)
      if (updateBookDto.title && updateBookDto.title !== existingBook!.title) {
        const titleExists = await this.booksService.titleExistsForUser(
          user.id,
          updateBookDto.title,
        );
        if (titleExists) {
          throwErrorResponse(
            `You already have a book with the title "${updateBookDto.title}". Please use a different title.`,
            HttpStatus.CONFLICT,
          );
        }
      }

      // Ensure userId cannot be changed
      const { userId, ...updateData } = updateBookDto as any;

      await this.booksService.update(id, updateData);
      const updatedBook = await this.booksService.findByIdAndUser(id, user.id);

      return successResponse(updatedBook, 'Book updated successfully');
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throwErrorResponse(
        error instanceof Error ? error.message : 'Unknown error occurred',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
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
    try {
      const book = await this.booksService.findByIdAndUser(id, user.id);
      if (!book) {
        throwErrorResponse('Book not found', HttpStatus.NOT_FOUND);
      }

      // Delete cover image from MinIO if it exists
      if (book!.coverImageUrl) {
        try {
          // Extract filename from URL and delete from MinIO
          const urlParts = book!.coverImageUrl.split('/');
          const fileName = urlParts[urlParts.length - 1];
          if (fileName) {
            await this.minioService.deleteFile(`covers/${user.id}/${fileName}`);
          }
        } catch (deleteError) {
          // Log error but don't fail the book deletion
          console.warn(`Failed to delete cover image: ${deleteError.message}`);
        }
      }

      await this.booksService.delete(id);
      return successResponse(null, 'Book deleted successfully');
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throwErrorResponse(
        error instanceof Error ? error.message : 'Unknown error occurred',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private async uploadCoverImage(
    coverImage: Express.Multer.File,
    user: User,
  ): Promise<string> {
    try {
      let coverImageUrl: string = '';

      // Validate file type
      const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png'];
      if (!allowedMimeTypes.includes(coverImage.mimetype)) {
        throw new HttpException(
          {
            success: false,
            message: 'Invalid file type. Only JPEG, PNG images are allowed.',
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      // Validate file size (max 3MB)
      const maxSize = 3 * 1024 * 1024; // 3MB
      if (coverImage.size > maxSize) {
        throw new HttpException(
          {
            success: false,
            message: 'File too large. Maximum size is 3MB.',
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      // Upload to MinIO with user-specific folder structure
      const uploadResult = await this.minioService.uploadFile(
        coverImage.buffer,
        coverImage.originalname,
        {
          fileName: `covers/${user.id}/${Date.now()}-${coverImage.originalname}`,
          contentType: coverImage.mimetype,
          metadata: {
            userId: user.id,
            uploadedAt: new Date().toISOString(),
          },
        },
      );

      coverImageUrl = uploadResult.url;
      return coverImageUrl;
    } catch (uploadError) {
      throw new HttpException(
        {
          success: false,
          message: `Failed to upload cover image: ${uploadError.message}`,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
