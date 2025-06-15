import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';

// allow `npm run migration:generate` to read .env      
dotenv.config({ path: '.env' });

export default new DataSource({
  type       : 'postgres',
  host       : process.env.DB_HOST ?? 'localhost',
  port       : +(process.env.DB_PORT   ?? 5432),
  username   : process.env.DB_USERNAME ?? 'books_user',
  password   : process.env.DB_PASSWORD ?? 'securepassword',
  database   : process.env.DB_DATABASE ?? 'books_dev',

  // entities & migrations in either .ts or .js build folder
  entities   : [
    process.env.NODE_ENV === 'production'
      ? 'dist/**/*.entity.js'
      : 'src/**/*.entity.ts',
  ],
  migrations : [
    process.env.NODE_ENV === 'production'
      ? 'dist/migrations/*.js'
      : 'src/migrations/*.ts',
  ],

  // never use auto-sync in prod
  synchronize: false,
  logging    : process.env.NODE_ENV === 'development',
});
