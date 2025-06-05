import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should return health check', () => {
      expect(appController.getHealth()).toEqual({
        success: true,
        message: 'Health check completed successfully',
        data: {
          environment: expect.any(String),
          services: { api: 'operational', database: 'connected' },
          status: 'healthy',
          uptime: expect.any(Number),
          version: '1.0.0',
        },
        timestamp: expect.any(String),
      });
    });
  });
});
