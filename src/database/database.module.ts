import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Env } from '../config/env.keys';
import { DatabaseController } from './database.controller';
import { DatabaseService } from './database.service';
import { entities } from './entities';
import { RepositoriesModule } from './repositories/repositories.module';
import { buildTypeOrmOptions } from './typeorm-options';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const databaseUrl = config.get<string>(Env.DATABASE_URL);
        return buildTypeOrmOptions(
          {
            DATABASE_URL: databaseUrl,
            DB_HOST: databaseUrl
              ? undefined
              : config.getOrThrow<string>(Env.DB_HOST),
            DB_PORT: databaseUrl
              ? undefined
              : config.getOrThrow<number>(Env.DB_PORT),
            DB_USERNAME: databaseUrl
              ? undefined
              : config.getOrThrow<string>(Env.DB_USERNAME),
            DB_PASSWORD: databaseUrl
              ? undefined
              : config.getOrThrow<string>(Env.DB_PASSWORD),
            DB_DATABASE: databaseUrl
              ? undefined
              : config.getOrThrow<string>(Env.DB_DATABASE),
            DB_SSL: config.get<boolean>(Env.DB_SSL),
            DB_MIGRATIONS_TABLE: config.getOrThrow<string>(
              Env.DB_MIGRATIONS_TABLE,
            ),
            TYPEORM_LOGGING: config.getOrThrow<boolean>(Env.TYPEORM_LOGGING),
          },
          __dirname + '/migrations',
        );
      },
    }),
    TypeOrmModule.forFeature(entities),
    RepositoriesModule,
  ],
  controllers: [DatabaseController],
  providers: [DatabaseService],
  exports: [TypeOrmModule, RepositoriesModule, DatabaseService],
})
export class DatabaseModule {}
