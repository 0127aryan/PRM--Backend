import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { Env } from './config/env.keys';
import { parseCommaSeparatedList } from './config/parse-list.util';
import { setupSwagger } from './config/swagger.config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  const port = config.getOrThrow<number>(Env.PORT);
  const apiHost = config.getOrThrow<string>(Env.API_HOST);
  const apiPrefix = config.getOrThrow<string>(Env.API_PREFIX);
  const frontendUrl = config.getOrThrow<string>(Env.FRONTEND_URL);
  const corsOrigins = new Set([
    frontendUrl,
    'http://localhost:3001',
    'http://127.0.0.1:3001',
  ]);
  const corsMethods = parseCommaSeparatedList(
    config.getOrThrow<string>(Env.CORS_METHODS),
  );
  const corsAllowedHeaders = parseCommaSeparatedList(
    config.getOrThrow<string>(Env.CORS_ALLOWED_HEADERS),
  );

  app.use(cookieParser());
  app.setGlobalPrefix(apiPrefix);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.enableCors({
    origin: (origin: string | undefined, callback: (error: Error | null, allow?: boolean) => void) => {
      if (!origin || corsOrigins.has(origin)) {
        callback(null, true);
        return;
      }
      callback(null, false);
    },
    credentials: true,
    methods: corsMethods,
    allowedHeaders: corsAllowedHeaders,
  });

  setupSwagger(app);

  await app.listen(port, apiHost);
}

bootstrap();
