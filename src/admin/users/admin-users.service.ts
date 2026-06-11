import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuthService } from '../../auth/auth.service';
import { AccountStatus, UserRole } from '../../database/enums';
import { User } from '../../database/entities/user.entity';
import type { IUserRepository } from '../../database/repositories/interfaces/user.repository.interface';
import {
  REFRESH_TOKEN_REPOSITORY,
  USER_REPOSITORY,
} from '../../database/repositories/repository.tokens';
import type { IRefreshTokenRepository } from '../../database/repositories/interfaces/refresh-token.repository.interface';
import { CreateUserDto } from './dto/create-user.dto';

export interface AdminUserListItem {
  id: number;
  username: string;
  email: string;
  role: UserRole;
  accountStatus: AccountStatus;
  isActive: boolean;
  forcePasswordChange: boolean;
  employeeId: number | null;
  createdAt: Date;
}

export interface CreateUserResult {
  user: AdminUserListItem;
  setupUrl: string;
  message: string;
}

@Injectable()
export class AdminUsersService {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: IUserRepository,
    @Inject(REFRESH_TOKEN_REPOSITORY)
    private readonly refreshTokens: IRefreshTokenRepository,
    private readonly auth: AuthService,
  ) {}

  async list(): Promise<AdminUserListItem[]> {
    const rows = await this.users.findAll();
    return rows.map((u) => this.toListItem(u));
  }

  async findOne(id: number): Promise<AdminUserListItem> {
    const user = await this.users.findByIdWithResource(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return this.toListItem(user);
  }

  async create(dto: CreateUserDto): Promise<CreateUserResult> {
    if (dto.role === UserRole.ADMIN) {
      throw new BadRequestException(
        'Admin accounts are created manually in the database',
      );
    }

    const email = dto.email.trim().toLowerCase();
    const username = (dto.username?.trim() || email).toLowerCase();

    if (await this.users.findByEmail(email)) {
      throw new ConflictException('Email already registered');
    }
    if (await this.users.findByUsername(username)) {
      throw new ConflictException('Username already taken');
    }

    const user = await this.users.createAppUser({ email, username, role: dto.role });
    const link = await this.auth.createPasswordSetupLink(user.id);

    const message =
      dto.role === UserRole.EMPLOYEE
        ? `User created. Next: add employee profile for user id ${user.id}.`
        : `User created. Next: add manager profile for user id ${user.id}.`;

    return {
      user: this.toListItem(user),
      setupUrl: link.setupUrl,
      message,
    };
  }

  async issueSetupLink(userId: number) {
    const user = await this.users.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return this.auth.createPasswordSetupLink(userId);
  }

  async resetPassword(userId: number) {
    const user = await this.users.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (user.role === UserRole.ADMIN) {
      throw new BadRequestException('Cannot reset admin password via API');
    }

    await this.users.updatePassword(userId, {
      passwordHash: null,
      accountStatus: AccountStatus.PENDING_PASSWORD,
      forcePasswordChange: false,
    });
    await this.refreshTokens.deleteAllForUser(userId);

    const link = await this.auth.createPasswordSetupLink(userId);
    return {
      message: 'Password cleared. User can set a new password on the login setup page.',
      setupUrl: link.setupUrl,
    };
  }

  async deactivate(userId: number) {
    const user = await this.users.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    await this.users.setActive(userId, false);
    await this.users.updateAccountStatus(userId, AccountStatus.INACTIVE);
    await this.refreshTokens.deleteAllForUser(userId);
    return { message: 'User deactivated' };
  }

  async reactivate(userId: number) {
    const user = await this.users.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (!user.passwordHash) {
      throw new BadRequestException(
        'User must complete password setup before reactivation',
      );
    }
    await this.users.setActive(userId, true);
    await this.users.updateAccountStatus(userId, AccountStatus.ACTIVE);
    return { message: 'User reactivated' };
  }

  private toListItem(user: User): AdminUserListItem {
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      accountStatus: user.accountStatus,
      isActive: Boolean(user.isActive),
      forcePasswordChange: Boolean(user.forcePasswordChange),
      employeeId: user.resource?.id ?? null,
      createdAt: user.createdAt,
    };
  }
}
