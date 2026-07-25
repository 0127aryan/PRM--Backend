import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CookieOptions, Response } from 'express';
import { Env } from '../../config/env.keys';
import { parseDurationToMs } from '../../common/utils/parse-duration.util';

@Injectable()
export class CookieService {
  private readonly accessName: string;
  private readonly refreshName: string;
  private readonly baseOptions: CookieOptions;

  constructor(private readonly config: ConfigService) {
    this.accessName = config.getOrThrow<string>(Env.COOKIE_ACCESS_NAME);
    this.refreshName = config.getOrThrow<string>(Env.COOKIE_REFRESH_NAME);
    this.baseOptions = {
      httpOnly: true,
      secure: config.getOrThrow<boolean>(Env.COOKIE_SECURE),
      sameSite: config.getOrThrow<'strict' | 'lax' | 'none'>(
        Env.COOKIE_SAME_SITE,
      ),
      path: '/',
    };
  }

  get accessCookieName(): string {
    return this.accessName;
  }

  get refreshCookieName(): string {
    return this.refreshName;
  }

  setAccessToken(res: Response, token: string): void {
    const maxAge = parseDurationToMs(
      this.config.getOrThrow<string>(Env.JWT_ACCESS_EXPIRES_IN),
    );
    res.cookie(this.accessName, token, { ...this.baseOptions, maxAge });
  }

  setRefreshToken(res: Response, token: string): void {
    const maxAge = parseDurationToMs(
      this.config.getOrThrow<string>(Env.JWT_REFRESH_EXPIRES_IN),
    );
    res.cookie(this.refreshName, token, { ...this.baseOptions, maxAge });
  }

  clearAuthCookies(res: Response): void {
    res.clearCookie(this.accessName, this.baseOptions);
    res.clearCookie(this.refreshName, this.baseOptions);
  }

  readRefreshToken(cookies: Record<string, string | undefined>): string | null {
    const value = cookies[this.refreshName];
    return value && value.length > 0 ? value : null;
  }
}
