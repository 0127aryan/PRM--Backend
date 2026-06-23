import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';

describe('Validation (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /api/auth/login rejects invalid body', () => {
    return request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'bad', password: 'x' })
      .expect(400);
  });

  it('POST /api/auth/login rejects unknown fields', () => {
    return request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'a@b.com', password: 'Password1!', extra: true })
      .expect(400);
  });
});
