import {
  IsOptional,
  IsString,
  IsInt,
  IsUrl,
  Length,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateBookDto {
  @IsOptional()
  @IsString()
  @Length(2, 255, { message: 'Title must be between 2 and 255 characters' })
  title?: string;

  @IsOptional()
  @IsString()
  @Length(2, 255, { message: 'Author must be between 2 and 255 characters' })
  author?: string;

  @IsOptional()
  @IsString()
  @Length(0, 1000, { message: 'Description must not exceed 1000 characters' })
  description?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Year must be an integer' })
  @Min(1, { message: 'Year must be greater than 0' })
  @Max(new Date().getFullYear() + 10, {
    message: 'Year cannot be too far in the future',
  })
  year?: number;

  @IsOptional()
  @IsString()
  @IsUrl({}, { message: 'Cover image URL must be a valid URL' })
  @Length(0, 500, { message: 'Cover image URL must not exceed 500 characters' })
  coverImageUrl?: string;
}
