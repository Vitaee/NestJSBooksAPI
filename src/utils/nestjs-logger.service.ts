import { Injectable, Logger, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface LogContext {
  traceId?: string;
  userId?: string;
  requestId?: string;
  [key: string]: any;
}

@Injectable()
export class AppLoggerService implements LoggerService {
  private readonly logger = new Logger();
  private readonly isDevelopment: boolean;

  constructor(private readonly configService: ConfigService) {
    this.isDevelopment = this.configService.get('NODE_ENV') !== 'production';
  }

  /**
   * Create a context-specific logger
   */
  createContextLogger(context: string): Logger {
    return new Logger(context);
  }

  /**
   * Log with structured data
   */
  logWithContext(
    level: 'log' | 'error' | 'warn' | 'debug' | 'verbose',
    message: string,
    context?: LogContext,
    loggerContext?: string,
  ) {
    const logger = loggerContext ? new Logger(loggerContext) : this.logger;

    if (this.isDevelopment || !context) {
      // Simple logging for development
      logger[level](message);
    } else {
      // Structured logging for production
      const logObject = {
        message,
        timestamp: new Date().toISOString(),
        ...context,
      };
      logger[level](JSON.stringify(logObject));
    }
  }

  /**
   * Log methods implementing LoggerService interface
   */
  log(message: any, context?: string) {
    const logger = context ? new Logger(context) : this.logger;
    logger.log(message);
  }

  error(message: any, trace?: string, context?: string) {
    const logger = context ? new Logger(context) : this.logger;
    logger.error(message, trace);
  }

  warn(message: any, context?: string) {
    const logger = context ? new Logger(context) : this.logger;
    logger.warn(message);
  }

  debug(message: any, context?: string) {
    const logger = context ? new Logger(context) : this.logger;
    logger.debug(message);
  }

  verbose(message: any, context?: string) {
    const logger = context ? new Logger(context) : this.logger;
    logger.verbose(message);
  }

  /**
   * Specialized logging methods
   */
  logHttpRequest(
    method: string,
    url: string,
    statusCode: number,
    duration: number,
    context?: LogContext,
  ) {
    this.logWithContext(
      'log',
      `${method} ${url} - ${statusCode} (${duration}ms)`,
      {
        type: 'http_request',
        method,
        url,
        statusCode,
        duration,
        ...context,
      },
      'HTTP',
    );
  }

  logDatabaseQuery(
    query: string,
    parameters: any[],
    duration: number,
    context?: LogContext,
  ) {
    this.logWithContext(
      'debug',
      `Database Query (${duration}ms)`,
      {
        type: 'database_query',
        query: this.isDevelopment ? query : '[REDACTED]', // Hide queries in production
        parameterCount: parameters?.length || 0,
        duration,
        ...context,
      },
      'Database',
    );
  }

  logServiceOperation(
    operation: string,
    entity: string,
    entityId?: string,
    context?: LogContext,
  ) {
    this.logWithContext(
      'log',
      `${operation} ${entity}${entityId ? ` (ID: ${entityId})` : ''}`,
      {
        type: 'service_operation',
        operation,
        entity,
        entityId,
        ...context,
      },
      'Service',
    );
  }

  logAuthentication(event: string, userId?: string, context?: LogContext) {
    this.logWithContext(
      'log',
      `Auth: ${event}${userId ? ` (User: ${userId})` : ''}`,
      {
        type: 'authentication',
        event,
        userId,
        ...context,
      },
      'Auth',
    );
  }

  logError(error: Error, context?: LogContext, loggerContext?: string) {
    this.logWithContext(
      'error',
      error.message,
      {
        type: 'application_error',
        error: error.name,
        stack: this.isDevelopment ? error.stack : undefined,
        ...context,
      },
      loggerContext || 'Error',
    );
  }
}
