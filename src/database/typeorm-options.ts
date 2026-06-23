import { join } from 'path';
import { DataSourceOptions } from 'typeorm';
import { entities } from './entities';

export interface DatabaseEnv {
  DATABASE_URL?: string;
  DB_HOST?: string;
  DB_PORT?: string | number;
  DB_USERNAME?: string;
  DB_PASSWORD?: string;
  DB_DATABASE?: string;
  DB_SSL?: string | boolean;
  DB_MIGRATIONS_TABLE?: string;
  TYPEORM_LOGGING?: string | boolean;
}

export function buildTypeOrmOptions(
  env: DatabaseEnv,
  migrationsDir: string,
): DataSourceOptions {
  const migrationsTable = env.DB_MIGRATIONS_TABLE ?? 'typeorm_migrations';
  const logging = false;
  const ssl =
    env.DB_SSL === 'true' || env.DB_SSL === true
      ? { rejectUnauthorized: false }
      : undefined;

  const base = {
    type: 'postgres' as const,
    entities,
    migrations: [join(migrationsDir, '*.{ts,js}')],
    migrationsTableName: migrationsTable,
    logging,
    synchronize: false,
  };

  if (env.DATABASE_URL) {
    return {
      ...base,
      url: env.DATABASE_URL,
      ...(ssl ? { ssl } : {}),
    };
  }

  return {
    ...base,
    host: env.DB_HOST,
    port: Number(env.DB_PORT),
    username: env.DB_USERNAME,
    password: env.DB_PASSWORD,
    database: env.DB_DATABASE,
    ...(ssl ? { ssl } : {}),
  };
}
