import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BooksController } from './books.controller';
import { BooksService } from './books.service';
import { Book } from '../../entities/book.entity';
import { StorageModule } from '../../storage/storage.module';

@Module({
  imports: [TypeOrmModule.forFeature([Book]), StorageModule],
  controllers: [BooksController],
  providers: [BooksService],
  exports: [BooksService],
})
export class BooksModule {}
