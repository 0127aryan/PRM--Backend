import { registerAs } from '@nestjs/config';
import { Env } from './env.keys';

export const appConfiguration = registerAs('app', () => ({
  nodeEnv: process.env[Env.NODE_ENV],
  port: Number(process.env[Env.PORT]),
  apiHost: process.env[Env.API_HOST],
  apiPrefix: process.env[Env.API_PREFIX],
  appName: process.env[Env.APP_NAME],
  frontendUrl: process.env[Env.FRONTEND_URL],
  corsMethods: process.env[Env.CORS_METHODS],
  corsAllowedHeaders: process.env[Env.CORS_ALLOWED_HEADERS],
}));

export const databaseConfiguration = registerAs('database', () => ({
  url: process.env[Env.DATABASE_URL],
  host: process.env[Env.DB_HOST],
  port: process.env[Env.DB_PORT] ? Number(process.env[Env.DB_PORT]) : undefined,
  username: process.env[Env.DB_USERNAME],
  password: process.env[Env.DB_PASSWORD],
  database: process.env[Env.DB_DATABASE],
  ssl: process.env[Env.DB_SSL] === 'true',
  logging: process.env[Env.TYPEORM_LOGGING] === 'true',
}));

export const authConfiguration = registerAs('auth', () => ({
  accessSecret: process.env[Env.JWT_ACCESS_SECRET],
  refreshSecret: process.env[Env.JWT_REFRESH_SECRET],
  accessExpiresIn: process.env[Env.JWT_ACCESS_EXPIRES_IN],
  refreshExpiresIn: process.env[Env.JWT_REFRESH_EXPIRES_IN],
  bcryptSaltRounds: Number(process.env[Env.BCRYPT_SALT_ROUNDS]),
  cookieAccessName: process.env[Env.COOKIE_ACCESS_NAME],
  cookieRefreshName: process.env[Env.COOKIE_REFRESH_NAME],
  cookieSecure: process.env[Env.COOKIE_SECURE] === 'true',
  cookieSameSite: process.env[Env.COOKIE_SAME_SITE],
  passwordSetupTokenExpiresHours: Number(
    process.env[Env.PASSWORD_SETUP_TOKEN_EXPIRES_HOURS],
  ),
}));

export const schedulerConfiguration = registerAs('scheduler', () => ({
  enabled: process.env[Env.SCHEDULER_ENABLED] === 'true',
  cron: process.env[Env.SCHEDULER_CRON],
}));

export const swaggerConfiguration = registerAs('swagger', () => ({
  title: process.env[Env.SWAGGER_TITLE],
  description: process.env[Env.SWAGGER_DESCRIPTION],
  version: process.env[Env.SWAGGER_VERSION],
  path: process.env[Env.SWAGGER_PATH],
}));

export const llmConfiguration = registerAs('llm', () => ({
  host: process.env[Env.LLM_HOST],
  apiKey: process.env[Env.LLM_API_KEY],
  model: process.env[Env.LLM_MODEL],
  provider: process.env[Env.LLM_PROVIDER],
}));
