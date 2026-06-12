import { plainToInstance, Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  Min,
  MinLength,
  ValidateIf,
  validateSync,
} from 'class-validator';

export enum NodeEnvironment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

export class EnvironmentVariables {
  @IsEnum(NodeEnvironment)
  NODE_ENV!: NodeEnvironment;

  @IsInt()
  @Min(1)
  @Max(65535)
  PORT!: number;

  @IsString()
  @IsNotEmpty()
  API_HOST!: string;

  @IsString()
  @IsNotEmpty()
  API_PREFIX!: string;

  @IsString()
  @IsNotEmpty()
  APP_NAME!: string;

  @IsUrl({ require_tld: false })
  FRONTEND_URL!: string;

  @IsString()
  @IsNotEmpty()
  CORS_METHODS!: string;

  @IsString()
  @IsNotEmpty()
  CORS_ALLOWED_HEADERS!: string;

  @IsString()
  @IsOptional()
  DATABASE_URL?: string;

  @ValidateIf((o: EnvironmentVariables) => !o.DATABASE_URL)
  @IsString()
  @IsNotEmpty()
  DB_HOST!: string;

  @ValidateIf((o: EnvironmentVariables) => !o.DATABASE_URL)
  @IsInt()
  @Min(1)
  @Max(65535)
  DB_PORT!: number;

  @ValidateIf((o: EnvironmentVariables) => !o.DATABASE_URL)
  @IsString()
  @IsNotEmpty()
  DB_USERNAME!: string;

  @ValidateIf((o: EnvironmentVariables) => !o.DATABASE_URL)
  @IsString()
  @IsNotEmpty()
  DB_PASSWORD!: string;

  @ValidateIf((o: EnvironmentVariables) => !o.DATABASE_URL)
  @IsString()
  @IsNotEmpty()
  DB_DATABASE!: string;

  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  @IsOptional()
  DB_SSL?: boolean;

  @IsString()
  @IsNotEmpty()
  DB_MIGRATIONS_TABLE!: string;

  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  TYPEORM_LOGGING!: boolean;

  @IsString()
  @MinLength(32)
  JWT_ACCESS_SECRET!: string;

  @IsString()
  @MinLength(32)
  JWT_REFRESH_SECRET!: string;

  @IsString()
  @IsNotEmpty()
  JWT_ACCESS_EXPIRES_IN!: string;

  @IsString()
  @IsNotEmpty()
  JWT_REFRESH_EXPIRES_IN!: string;

  @IsInt()
  @Min(4)
  @Max(15)
  BCRYPT_SALT_ROUNDS!: number;

  @IsString()
  @IsNotEmpty()
  COOKIE_ACCESS_NAME!: string;

  @IsString()
  @IsNotEmpty()
  COOKIE_REFRESH_NAME!: string;

  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  COOKIE_SECURE!: boolean;

  @IsIn(['strict', 'lax', 'none'])
  COOKIE_SAME_SITE!: 'strict' | 'lax' | 'none';

  @IsInt()
  @Min(1)
  @Max(168)
  PASSWORD_SETUP_TOKEN_EXPIRES_HOURS!: number;

  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  SCHEDULER_ENABLED!: boolean;

  @IsString()
  @IsNotEmpty()
  SCHEDULER_CRON!: string;

  @IsString()
  @IsNotEmpty()
  SWAGGER_TITLE!: string;

  @IsString()
  @IsNotEmpty()
  SWAGGER_DESCRIPTION!: string;

  @IsString()
  @IsNotEmpty()
  SWAGGER_VERSION!: string;

  @IsString()
  @IsNotEmpty()
  SWAGGER_PATH!: string;

  @IsString()
  @IsOptional()
  LLM_HOST?: string;

  @IsString()
  @IsOptional()
  LLM_API_KEY?: string;

  @IsString()
  @IsOptional()
  LLM_MODEL?: string;

  @IsString()
  @IsOptional()
  LLM_PROVIDER?: string;
}

export function validateEnv(config: Record<string, unknown>): EnvironmentVariables {
  const validated = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validated, {
    skipMissingProperties: false,
    whitelist: true,
    forbidUnknownValues: false,
  });

  if (errors.length > 0) {
    const messages = errors.flatMap((error) =>
      Object.values(error.constraints ?? {}),
    );
    throw new Error(
      `Environment validation failed. Copy .env.example to .env and set all values:\n${messages.join('\n')}`,
    );
  }

  return validated;
}
