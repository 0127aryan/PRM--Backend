import { Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import {
  appConfiguration,
  authConfiguration,
  databaseConfiguration,
  schedulerConfiguration,
  swaggerConfiguration,
} from './configuration';
import { validateEnv } from './env.validation';

@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env'],
      validate: validateEnv,
      load: [
        appConfiguration,
        databaseConfiguration,
        authConfiguration,
        schedulerConfiguration,
        swaggerConfiguration,
      ],
    }),
  ],
})
export class AppConfigModule {}
