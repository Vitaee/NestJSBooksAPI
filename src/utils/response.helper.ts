export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  errors?: any[];
  pagination?: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
  timestamp?: string;
}

/**
 * Create a successful response
 */
export const successResponse = <T>(
  data: T,
  message: string = 'Operation completed successfully',
): ApiResponse<T> => {
  return {
    success: true,
    message,
    data,
    timestamp: new Date().toISOString(),
  };
};

/**
 * Create a successful response with pagination
 */
export const successResponseWithPagination = <T>(
  data: T[],
  pagination: ApiResponse['pagination'],
  message: string = 'Data retrieved successfully',
): ApiResponse<T[]> => {
  return {
    success: true,
    message,
    data,
    pagination,
    timestamp: new Date().toISOString(),
  };
};

/**
 * Create a validation error response helper (for NestJS exception filters)
 */
export const validationErrorResponse = (
  errors: any[],
  message: string = 'Validation failed',
): ApiResponse => {
  return {
    success: false,
    message,
    errors,
    timestamp: new Date().toISOString(),
  };
};

/**
 * Throw an HttpException with consistent error response structure
 */
export const throwErrorResponse = (
  message: string,
  statusCode: number,
  errors?: any[],
): never => {
  const HttpException = require('@nestjs/common').HttpException;
  throw new HttpException(
    {
      success: false,
      message,
      errors,
      timestamp: new Date().toISOString(),
    },
    statusCode,
  );
};
