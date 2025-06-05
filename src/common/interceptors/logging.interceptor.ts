import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { Request, Response } from 'express';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const { method, originalUrl, ip, headers } = request;
    const userAgent = headers['user-agent'] || '';
    const startTime = Date.now();

    // Generate request ID for tracing
    const requestId =
      headers['x-request-id'] ||
      `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Add request ID to response headers
    response.setHeader('x-request-id', requestId);

    this.logger.log(
      `Incoming Request: ${method} ${originalUrl} - ${ip} - ${userAgent}`,
      `HTTP-${requestId}`,
    );

    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - startTime;
        const { statusCode } = response;

        this.logger.log(
          `Request Complete: ${method} ${originalUrl} - ${statusCode} - ${duration}ms`,
          `HTTP-${requestId}`,
        );
      }),
      catchError((error) => {
        const duration = Date.now() - startTime;
        const statusCode = error.status || 500;

        this.logger.error(
          `Request Failed: ${method} ${originalUrl} - ${statusCode} - ${duration}ms - ${error.message}`,
          error.stack,
          `HTTP-${requestId}`,
        );

        throw error;
      }),
    );
  }
}
