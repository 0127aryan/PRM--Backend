import {
  BadRequestException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Response } from 'express';
import { addDurationToDate } from '../common/utils/parse-duration.util';
import { Env } from '../config/env.keys';
import { AccountStatus, UserRole } from '../database/enums';
import { User } from '../database/entities/user.entity';
import type { IPasswordSetupTokenRepository } from '../database/repositories/interfaces/password-setup-token.repository.interface';
import type { IRefreshTokenRepository } from '../database/repositories/interfaces/refresh-token.repository.interface';
import type { IUserRepository } from '../database/repositories/interfaces/user.repository.interface';
import {
  PASSWORD_SETUP_TOKEN_REPOSITORY,
  REFRESH_TOKEN_REPOSITORY,
  USER_REPOSITORY,
} from '../database/repositories/repository.tokens';
import { ChangePasswordDto } from './dto/change-password.dto';
import { LoginDto } from './dto/login.dto';
import { SetPasswordDto } from './dto/set-password.dto';
import { AuthUserResponse } from './interfaces/auth-user.interface';
import { JwtAccessPayload } from './interfaces/jwt-payload.interface';
import { CookieService } from './services/cookie.service';
import { TokenHashService } from './services/token-hash.service';

export interface LoginResult {
  user: AuthUserResponse;
  requiresPasswordChange: boolean;
  accessToken: string;
}

interface SessionTokens {
  accessToken: string;
  refreshToken: string;
}

export interface PasswordSetupLinkResult {
  setupUrl: string;
  email: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly config: ConfigService,
    private readonly jwt: JwtService,
    private readonly cookies: CookieService,
    private readonly tokenHash: TokenHashService,
    @Inject(USER_REPOSITORY) private readonly users: IUserRepository,
    @Inject(REFRESH_TOKEN_REPOSITORY)
    private readonly refreshTokens: IRefreshTokenRepository,
    @Inject(PASSWORD_SETUP_TOKEN_REPOSITORY)
    private readonly setupTokens: IPasswordSetupTokenRepository,
  ) {}

  async login(dto: LoginDto, res: Response): Promise<LoginResult> {
    const user = await this.users.findByEmail(dto.email.toLowerCase().trim());
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }
    this.assertCanAuthenticate(user);

    if (user.accountStatus === AccountStatus.PENDING_PASSWORD) {
      throw new UnauthorizedException({
        message:
          'Set up your password before signing in. You will be redirected to the password setup page.',
        code: 'PASSWORD_SETUP_REQUIRED',
      });
    }

    if (!user.passwordHash) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const valid = await this.tokenHash.comparePassword(
      dto.password,
      user.passwordHash,
    );
    if (!valid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const { accessToken } = await this.issueSession(user, res);
    return {
      user: this.toAuthUser(user),
      requiresPasswordChange: Boolean(user.forcePasswordChange),
      accessToken,
    };
  }

  async refresh(
    cookies: Record<string, string | undefined>,
    res: Response,
  ): Promise<LoginResult> {
    const plainRefresh = this.cookies.readRefreshToken(cookies);
    if (!plainRefresh) {
      throw new UnauthorizedException('Refresh token missing');
    }

    const tokenHash = this.tokenHash.sha256(plainRefresh);
    const stored = await this.refreshTokens.findByTokenHash(tokenHash);
    if (!stored || stored.expiresAt.getTime() < Date.now()) {
      this.cookies.clearAuthCookies(res);
      throw new UnauthorizedException('Refresh token invalid or expired');
    }

    const user = await this.users.findByIdWithResource(stored.userId);
    if (!user) {
      this.cookies.clearAuthCookies(res);
      throw new UnauthorizedException('User not found');
    }
    this.assertCanAuthenticate(user);

    const payload = this.buildAccessPayload(user);
    const accessToken = await this.signAccessToken(payload);
    this.cookies.setAccessToken(res, accessToken);

    return {
      user: this.toAuthUser(user),
      requiresPasswordChange: Boolean(user.forcePasswordChange),
      accessToken,
    };
  }

  async logout(
    cookies: Record<string, string | undefined>,
    res: Response,
  ): Promise<{ message: string }> {
    const plainRefresh = this.cookies.readRefreshToken(cookies);
    if (plainRefresh) {
      const tokenHash = this.tokenHash.sha256(plainRefresh);
      const stored = await this.refreshTokens.findByTokenHash(tokenHash);
      if (stored) {
        await this.refreshTokens.deleteById(stored.id);
      }
    }
    this.cookies.clearAuthCookies(res);
    return { message: 'Logged out' };
  }

  async getMe(userId: number): Promise<AuthUserResponse> {
    const user = await this.users.findByIdWithResource(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    this.assertCanAuthenticate(user);
    return this.toAuthUser(user);
  }

  async setPassword(dto: SetPasswordDto, res: Response): Promise<LoginResult> {
    const email = dto.email.trim().toLowerCase();
    const user = await this.users.findByEmail(email);
    if (!user || !this.isEligibleForInitialPasswordSetup(user)) {
      throw new BadRequestException(
        'This email is not eligible for first-time password setup. Sign in if you already have a password, or contact your administrator.',
      );
    }

    const passwordHash = await this.tokenHash.hashPassword(dto.password);
    await this.users.updatePassword(user.id, {
      passwordHash,
      accountStatus: AccountStatus.ACTIVE,
      forcePasswordChange: false,
    });

    const updated = await this.users.findByIdWithResource(user.id);
    if (!updated) {
      throw new BadRequestException('User not found after password setup');
    }

    await this.refreshTokens.deleteAllForUser(user.id);
    const { accessToken } = await this.issueSession(updated, res);

    return {
      user: this.toAuthUser(updated),
      requiresPasswordChange: false,
      accessToken,
    };
  }

  async validateSetupEligibility(
    email: string,
  ): Promise<{ eligible: boolean; email?: string }> {
    const normalized = email?.trim().toLowerCase();
    if (!normalized) {
      return { eligible: false };
    }
    const user = await this.users.findByEmail(normalized);
    if (!user || !this.isEligibleForInitialPasswordSetup(user)) {
      return { eligible: false };
    }
    return { eligible: true, email: user.email };
  }

  async changePassword(
    userId: number,
    dto: ChangePasswordDto,
  ): Promise<{ message: string }> {
    const user = await this.users.findById(userId);
    if (!user?.passwordHash) {
      throw new UnauthorizedException('User not found');
    }

    const valid = await this.tokenHash.comparePassword(
      dto.currentPassword,
      user.passwordHash,
    );
    if (!valid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    if (dto.currentPassword === dto.newPassword) {
      throw new BadRequestException(
        'New password must differ from current password',
      );
    }

    const passwordHash = await this.tokenHash.hashPassword(dto.newPassword);
    await this.users.updatePassword(userId, {
      passwordHash,
      forcePasswordChange: false,
    });

    return { message: 'Password updated' };
  }

  /** Admin helper: URL to the set-password page with email prefilled. */
  async createPasswordSetupLink(
    userId: number,
  ): Promise<PasswordSetupLinkResult> {
    const user = await this.users.findById(userId);
    if (!user) {
      throw new BadRequestException('User not found');
    }
    if (!this.isEligibleForInitialPasswordSetup(user)) {
      throw new BadRequestException('User already has an active password');
    }

    const frontendUrl = this.config.getOrThrow<string>(Env.FRONTEND_URL);
    const setupUrl = `${frontendUrl}/set-password?email=${encodeURIComponent(user.email)}`;

    return { setupUrl, email: user.email };
  }

  private isEligibleForInitialPasswordSetup(user: User): boolean {
    if (!user.isActive || user.accountStatus === AccountStatus.INACTIVE) {
      return false;
    }
    if (user.accountStatus === AccountStatus.PENDING_PASSWORD) {
      return true;
    }
    return !user.passwordHash;
  }

  private async issueSession(
    user: User,
    res: Response,
  ): Promise<SessionTokens> {
    const payload = this.buildAccessPayload(user);
    const accessToken = await this.signAccessToken(payload);
    const plainRefresh = this.tokenHash.generatePlainToken();
    const refreshHash = this.tokenHash.sha256(plainRefresh);
    const refreshExpiresIn = this.config.getOrThrow<string>(
      Env.JWT_REFRESH_EXPIRES_IN,
    );
    const expiresAt = addDurationToDate(new Date(), refreshExpiresIn);

    await this.refreshTokens.deleteAllForUser(user.id);
    await this.refreshTokens.create({
      userId: user.id,
      tokenHash: refreshHash,
      expiresAt,
    });

    this.cookies.setAccessToken(res, accessToken);
    this.cookies.setRefreshToken(res, plainRefresh);

    return { accessToken, refreshToken: plainRefresh };
  }

  private buildAccessPayload(user: User): JwtAccessPayload {
    return {
      sub: user.id,
      email: user.email,
      role: user.role,
      forcePasswordChange: Boolean(user.forcePasswordChange),
    };
  }

  private signAccessToken(payload: JwtAccessPayload): Promise<string> {
    const expiresIn = this.config.getOrThrow<string>(Env.JWT_ACCESS_EXPIRES_IN);
    return this.jwt.signAsync(payload, {
      secret: this.config.getOrThrow<string>(Env.JWT_ACCESS_SECRET),
      expiresIn: expiresIn as `${number}m`,
    });
  }

  private assertCanAuthenticate(user: User): void {
    if (!user.isActive || user.accountStatus === AccountStatus.INACTIVE) {
      throw new UnauthorizedException('Account is inactive');
    }
    if (user.accountStatus === AccountStatus.FROZEN) {
      throw new UnauthorizedException(
        'Your account is frozen due to consecutive missed timesheets. Please contact your manager or administrator.',
      );
    }
  }

  private toAuthUser(user: User): AuthUserResponse {
    const employeeId =
      user.role === UserRole.EMPLOYEE ? (user.resource?.id ?? null) : null;
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
      accountStatus: user.accountStatus,
      forcePasswordChange: Boolean(user.forcePasswordChange),
      employeeId,
    };
  }
}
