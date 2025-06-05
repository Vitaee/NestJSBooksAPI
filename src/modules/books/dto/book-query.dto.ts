import { IsOptional, IsString, IsInt, IsIn, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class BookQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Page must be an integer' })
  @Min(1, { message: 'Page must be greater than 0' })
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Limit must be an integer' })
  @Min(1, { message: 'Limit must be greater than 0' })
  limit?: number;

  @IsOptional()
  @IsString()
  @IsIn(['title', 'author', 'year', 'createdAt', 'updatedAt'], {
    message:
      'Sort by must be one of: title, author, year, createdAt, updatedAt',
  })
  sortBy?: string;

  @IsOptional()
  @IsString()
  @IsIn(['ASC', 'DESC'], { message: 'Sort order must be ASC or DESC' })
  sortOrder?: 'ASC' | 'DESC';

  @IsOptional()
  @IsString()
  author?: string;

  @IsOptional()
  @IsString()
  search?: string;
}
