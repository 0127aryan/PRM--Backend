import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActivityTag } from '../entities/activity-tag.entity';
import { PasswordSetupToken } from '../entities/password-setup-token.entity';
import { RefreshToken } from '../entities/refresh-token.entity';
import { SystemConfig } from '../entities/system-config.entity';
import { User } from '../entities/user.entity';
import {
  ACTIVITY_TAG_REPOSITORY,
  PASSWORD_SETUP_TOKEN_REPOSITORY,
  REFRESH_TOKEN_REPOSITORY,
  SYSTEM_CONFIG_REPOSITORY,
  USER_REPOSITORY,
} from './repository.tokens';
import { TypeOrmActivityTagRepository } from './typeorm/typeorm-activity-tag.repository';
import { TypeOrmPasswordSetupTokenRepository } from './typeorm/typeorm-password-setup-token.repository';
import { TypeOrmRefreshTokenRepository } from './typeorm/typeorm-refresh-token.repository';
import { TypeOrmSystemConfigRepository } from './typeorm/typeorm-system-config.repository';
import { TypeOrmUserRepository } from './typeorm/typeorm-user.repository';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      SystemConfig,
      ActivityTag,
      RefreshToken,
      PasswordSetupToken,
    ]),
  ],
  providers: [
    { provide: USER_REPOSITORY, useClass: TypeOrmUserRepository },
    {
      provide: SYSTEM_CONFIG_REPOSITORY,
      useClass: TypeOrmSystemConfigRepository,
    },
    {
      provide: ACTIVITY_TAG_REPOSITORY,
      useClass: TypeOrmActivityTagRepository,
    },
    {
      provide: REFRESH_TOKEN_REPOSITORY,
      useClass: TypeOrmRefreshTokenRepository,
    },
    {
      provide: PASSWORD_SETUP_TOKEN_REPOSITORY,
      useClass: TypeOrmPasswordSetupTokenRepository,
    },
  ],
  exports: [
    USER_REPOSITORY,
    SYSTEM_CONFIG_REPOSITORY,
    ACTIVITY_TAG_REPOSITORY,
    REFRESH_TOKEN_REPOSITORY,
    PASSWORD_SETUP_TOKEN_REPOSITORY,
  ],
})
export class RepositoriesModule {}
