import { Entity, Column, OneToMany, Index } from 'typeorm';
import { Exclude } from 'class-transformer';
import { BaseEntity } from './base.entity';
import { Book } from './book.entity';

@Entity('users')
@Index(['email'], { unique: true })
export class User extends BaseEntity {
  @Column({ type: 'varchar', length: 255, unique: true })
  email: string;

  @Column({ type: 'varchar', length: 255 })
  @Exclude()
  password: string;

  @OneToMany(() => Book, (book) => book.user, { cascade: false })
  books: Book[];

  constructor(partial: Partial<User>) {
    super();
    Object.assign(this, partial);
  }
}
