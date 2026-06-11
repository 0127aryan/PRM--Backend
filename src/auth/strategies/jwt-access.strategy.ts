import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Env } from '../../config/env.keys';
import { AccountStatus } from '../../database/enums';
import { USER_REPOSITORY } from '../../database/repositories/repository.tokens';
import type { IUserRepository } from '../../database/repositories/interfaces/user.repository.interface';
import { Inject } from '@nestjs/common';
import { JwtAccessPayload } from '../interfaces/jwt-payload.interface';

@Injectable()
export class JwtAccessStrategy extends PassportStrategy(Strategy, 'jwt-access') {
  constructor(
    config: ConfigService,
    @Inject(USER_REPOSITORY) private readonly users: IUserRepository,
  ) {
    const cookieName = config.getOrThrow<string>(Env.COOKIE_ACCESS_NAME);
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        (req: Request) => {
          const cookies = req.cookies as Record<string, string | undefined>;
          return cookies?.[cookieName] ?? null;
        },
      ]),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>(Env.JWT_ACCESS_SECRET),
    });
  }

  async validate(payload: JwtAccessPayload): Promise<JwtAccessPayload> {
    const user = await this.users.findById(payload.sub);
    if (
      !user ||
      !user.isActive ||
      user.accountStatus !== AccountStatus.ACTIVE
    ) {
      throw new UnauthorizedException('Session is no longer valid');
    }
    return {
      sub: user.id,
      email: user.email,
      role: user.role,
      forcePasswordChange: Boolean(user.forcePasswordChange),
    };
  }
}
