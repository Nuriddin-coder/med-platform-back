import { plainToInstance, Type } from 'class-transformer';
import { IsEnum, IsNumber, IsOptional, IsString, validateSync } from 'class-validator';

export enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

export class EnvironmentVariables {
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  PORT: number = 4000;

  @IsEnum(Environment)
  @IsOptional()
  NODE_ENV: Environment = Environment.Development;

  @IsString()
  DATABASE_URL: string;

  @IsString()
  @IsOptional()
  DATABASE_URL_UNPOOLED?: string;

  @IsString()
  JWT_ACCESS_SECRET: string;

  @IsString()
  JWT_REFRESH_SECRET: string;

  @IsString()
  @IsOptional()
  JWT_ACCESS_EXPIRES_IN: string = '15m';

  @IsString()
  @IsOptional()
  JWT_REFRESH_EXPIRES_IN: string = '7d';

  @IsString()
  @IsOptional()
  CORS_ORIGINS: string = 'http://localhost:3000,http://localhost:5173';

  @IsString()
  @IsOptional()
  UPLOAD_DIR: string = './uploads';

  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  MAX_FILE_SIZE_MB: number = 10;

  @IsString()
  @IsOptional()
  APP_URL: string = 'http://localhost:4000';

  @IsString()
  @IsOptional()
  WEB_URL: string = 'http://localhost:3000';

  @IsString()
  @IsOptional()
  ADMIN_URL: string = 'http://localhost:5173';

  @IsString()
  @IsOptional()
  SEED_SUPER_ADMIN_EMAIL: string = 'admin@med.uz';

  @IsString()
  @IsOptional()
  SEED_SUPER_ADMIN_PASSWORD: string = 'Admin123!@#';
}

export function validateEnvironment(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    const errorMessages = errors
      .map((err) => Object.values(err.constraints || {}).join(', '))
      .join('; ');
    throw new Error(`Environment validation error: ${errorMessages}`);
  }

  return validatedConfig;
}
