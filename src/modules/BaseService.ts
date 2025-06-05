import {
  Repository,
  FindManyOptions,
  FindOptionsWhere,
  UpdateResult,
  DeleteResult,
  DeepPartial,
  ObjectLiteral,
  EntityTarget,
} from 'typeorm';
import { BaseEntity } from '../entities/base.entity';

export interface PaginationOptions {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

export abstract class BaseService<T extends BaseEntity & ObjectLiteral> {
  protected repository: Repository<T>;
  protected entityTarget: EntityTarget<T>;

  constructor(repository: Repository<T>) {
    this.repository = repository;
    this.entityTarget = repository.metadata.target as EntityTarget<T>;
  }

  /**
   * Get a record by ID
   */
  async getById(id: number): Promise<T | null> {
    try {
      return await this.repository.findOneBy({ id } as FindOptionsWhere<T>);
    } catch (error) {
      this.handleError('getById', error);
    }
  }

  /**
   * Get all records with optional filtering
   */
  async getAll(options?: FindManyOptions<T>): Promise<T[]> {
    try {
      return await this.repository.find(options);
    } catch (error) {
      this.handleError('getAll', error);
    }
  }

  /**
   * Create a new record
   */
  async create(data: DeepPartial<T>): Promise<T> {
    try {
      const entity = this.repository.create(data);
      return await this.repository.save(entity);
    } catch (error) {
      this.handleError('create', error);
    }
  }

  /**
   * Update a record by ID
   */
  async update(id: number, data: DeepPartial<T>): Promise<UpdateResult> {
    try {
      return await this.repository.update(id, data);
    } catch (error) {
      this.handleError('update', error);
    }
  }

  /**
   * Update records by field
   */
  async updateByField(
    searchField: keyof T,
    searchValue: any,
    data: DeepPartial<T>,
  ): Promise<UpdateResult> {
    try {
      const whereClause = { [searchField]: searchValue } as FindOptionsWhere<T>;
      return await this.repository.update(whereClause, data);
    } catch (error) {
      this.handleError('updateByField', error);
    }
  }

  /**
   * Delete a record by ID
   */
  async delete(id: number): Promise<DeleteResult> {
    try {
      return await this.repository.delete(id);
    } catch (error) {
      this.handleError('delete', error);
    }
  }

  /**
   * Delete records by field
   */
  async deleteByField(
    searchField: keyof T,
    searchValue: any,
  ): Promise<DeleteResult> {
    try {
      const whereClause = { [searchField]: searchValue } as FindOptionsWhere<T>;
      return await this.repository.delete(whereClause);
    } catch (error) {
      this.handleError('deleteByField', error);
    }
  }

  /**
   * Get records with pagination
   */
  async getPaginated(
    options: PaginationOptions,
    findOptions?: Omit<FindManyOptions<T>, 'take' | 'skip'>,
  ): Promise<PaginatedResult<T>> {
    try {
      const { page, limit, sortBy, sortOrder } = options;

      // Validate pagination parameters
      if (page < 1) throw new Error('Page must be greater than 0');
      if (limit < 1 || limit > 100)
        throw new Error('Limit must be between 1 and 100');

      const offset = (page - 1) * limit;

      const queryOptions: FindManyOptions<T> = {
        ...findOptions,
        take: limit,
        skip: offset,
      };

      if (sortBy) {
        queryOptions.order = { [sortBy]: sortOrder || 'ASC' } as any;
      }

      const [data, count] = await this.repository.findAndCount(queryOptions);
      const totalPages = Math.ceil(count / limit);

      return {
        data,
        pagination: {
          currentPage: page,
          totalPages,
          totalItems: count,
          itemsPerPage: limit,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1,
        },
      };
    } catch (error) {
      this.handleError('getPaginated', error);
    }
  }

  /**
   * Find records by a specific field
   */
  async findByField(
    field: keyof T,
    value: any,
    options?: Omit<FindManyOptions<T>, 'where'>,
  ): Promise<T[]> {
    try {
      const whereClause = { [field]: value } as FindOptionsWhere<T>;
      return await this.repository.find({
        ...options,
        where: whereClause,
      });
    } catch (error) {
      this.handleError('findByField', error);
    }
  }

  /**
   * Find one record by field
   */
  async findOneByField(
    field: keyof T,
    value: any,
    options?: Omit<FindManyOptions<T>, 'where'>,
  ): Promise<T | null> {
    try {
      const whereClause = { [field]: value } as FindOptionsWhere<T>;
      return await this.repository.findOne({
        ...options,
        where: whereClause,
      });
    } catch (error) {
      this.handleError('findOneByField', error);
    }
  }

  /**
   * Check if a record exists
   */
  async exists(field: keyof T, value: any): Promise<boolean> {
    try {
      const whereClause = { [field]: value } as FindOptionsWhere<T>;
      const count = await this.repository.count({ where: whereClause });
      return count > 0;
    } catch (error) {
      this.handleError('exists', error);
    }
  }

  /**
   * Get total count of records
   */
  async count(whereClause?: FindOptionsWhere<T>): Promise<number> {
    try {
      return await this.repository.count({ where: whereClause });
    } catch (error) {
      this.handleError('count', error);
    }
  }

  /**
   * Bulk create records
   */
  async bulkCreate(dataArray: DeepPartial<T>[]): Promise<T[]> {
    try {
      if (!dataArray.length) return [];
      const entities = this.repository.create(dataArray);
      return await this.repository.save(entities);
    } catch (error) {
      this.handleError('bulkCreate', error);
    }
  }

  /**
   * Update and return the updated entity
   */
  async updateAndReturn(id: number, data: DeepPartial<T>): Promise<T | null> {
    try {
      await this.repository.update(id, data);
      return await this.getById(id);
    } catch (error) {
      this.handleError('updateAndReturn', error);
    }
  }

  /**
   * Soft delete methods - only available if entity supports it
   */
  async softDelete(id: number): Promise<UpdateResult> {
    try {
      return await this.repository.softDelete(id);
    } catch (error) {
      this.handleError('softDelete', error);
    }
  }

  async restore(id: number): Promise<UpdateResult> {
    try {
      return await this.repository.restore(id);
    } catch (error) {
      this.handleError('restore', error);
    }
  }

  /**
   * Centralized error handling
   */
  protected handleError(operation: string, error: unknown): never {
    const message = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Service error in ${operation}: ${message}`);
  }

  /**
   * Transaction wrapper - useful for complex operations
   */
  async withTransaction<R>(
    operation: (repository: Repository<T>) => Promise<R>,
  ): Promise<R> {
    return await this.repository.manager.transaction(async (manager) => {
      const transactionalRepository = manager.getRepository<T>(
        this.entityTarget,
      );
      return await operation(transactionalRepository);
    });
  }
}

export default BaseService;
