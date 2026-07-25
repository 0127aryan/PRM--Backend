import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Env } from './env.keys';

export function setupSwagger(app: INestApplication): void {
  const config = app.get(ConfigService);

  const document = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle(config.getOrThrow<string>(Env.SWAGGER_TITLE))
      .setDescription(config.getOrThrow<string>(Env.SWAGGER_DESCRIPTION))
      .setVersion(config.getOrThrow<string>(Env.SWAGGER_VERSION))
      .build(),
  );

  SwaggerModule.setup(
    config.getOrThrow<string>(Env.SWAGGER_PATH),
    app,
    document,
    { useGlobalPrefix: true },
  );
}
