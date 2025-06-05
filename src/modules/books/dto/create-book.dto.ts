import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsInt,
  Length,
  Min,
  Max,
  IsNumber,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class CreateBookDto {
  @ApiProperty({
    description: 'Book title',
    example: 'The Great Gatsby',
    minLength: 2,
    maxLength: 255,
  })
  @IsNotEmpty({ message: 'Title is required' })
  @IsString()
  @Length(2, 255, { message: 'Title must be between 2 and 255 characters' })
  title: string;

  @ApiProperty({
    description: 'Book author',
    example: 'F. Scott Fitzgerald',
    minLength: 2,
    maxLength: 255,
  })
  @IsNotEmpty({ message: 'Author is required' })
  @IsString()
  @Length(2, 255, { message: 'Author must be between 2 and 255 characters' })
  author: string;

  @ApiProperty({
    description: 'Book description',
    example: 'A classic novel about the Jazz Age',
    required: false,
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @Length(0, 1000, { message: 'Description must not exceed 1000 characters' })
  description?: string;

  @ApiProperty({
    description: 'Publication year',
    example: 1925,
    required: false,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Year must be an integer' })
  @Min(1, { message: 'Year must be greater than 0' })
  @Max(new Date().getFullYear() + 10, {
    message: 'Year cannot be too far in the future',
  })
  year?: number;

  @ApiProperty({
    description: 'User ID',
    example: 1,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Year must be an integer' })
  userId?: number;
}
