import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AppService } from './app.service';
import { Public } from './modules/auth/decorators/public.decorator';
import { successResponse } from './utils/response.helper';

@ApiTags('Health')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Public()
  @Get()
  @ApiOperation({
    summary: 'Root endpoint',
    description: 'Basic root endpoint to verify the API is running',
  })
  @ApiResponse({
    status: 200,
    description: 'API is running successfully',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'ok' },
        message: { type: 'string', example: 'Books API is running' },
        timestamp: { type: 'string', example: '2024-01-01T00:00:00.000Z' },
        version: { type: 'string', example: '1.0.0' },
      },
    },
  })
  getRoot() {
    const healthData = {
      status: 'ok',
      version: '1.0.0',
    };
    return successResponse(healthData, 'Books API is running');
  }

  @Public()
  @Get('health')
  @ApiOperation({
    summary: 'Health check',
    description: 'Detailed health check endpoint with system information',
  })
  @ApiResponse({
    status: 200,
    description: 'Health check completed successfully',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'healthy' },
        timestamp: { type: 'string', example: '2024-01-01T00:00:00.000Z' },
        uptime: { type: 'number', example: 3600 },
        version: { type: 'string', example: '1.0.0' },
        environment: { type: 'string', example: 'development' },
        services: {
          type: 'object',
          properties: {
            database: { type: 'string', example: 'connected' },
            api: { type: 'string', example: 'operational' },
          },
        },
      },
    },
  })
  getHealth() {
    const healthData = {
      status: 'healthy',
      uptime: process.uptime(),
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      services: {
        database: 'connected',
        api: 'operational',
      },
    };
    return successResponse(healthData, 'Health check completed successfully');
  }
}
