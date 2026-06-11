import { AccountStatus, UserRole } from '../../enums';
import { User } from '../../entities/user.entity';

export interface CreateAdminUserInput {
  username: string;
  email: string;
  passwordHash: string;
}

export interface CreateAppUserInput {
  username: string;
  email: string;
  role: UserRole;
}

export interface UpdateUserPasswordInput {
  passwordHash: string | null;
  accountStatus?: AccountStatus;
  forcePasswordChange?: boolean;
}

export interface IUserRepository {
  findByUsername(username: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  findById(id: number): Promise<User | null>;
  findByIdWithResource(id: number): Promise<User | null>;
  findAll(): Promise<User[]>;
  createAdmin(input: CreateAdminUserInput): Promise<User>;
  createAppUser(input: CreateAppUserInput): Promise<User>;
  updatePassword(userId: number, input: UpdateUserPasswordInput): Promise<void>;
  setActive(userId: number, isActive: boolean): Promise<void>;
  updateAccountStatus(userId: number, status: AccountStatus): Promise<void>;
}

export const createAdminDefaults = (input: CreateAdminUserInput): Partial<User> => ({
  username: input.username,
  email: input.email,
  passwordHash: input.passwordHash,
  role: UserRole.ADMIN,
  accountStatus: AccountStatus.ACTIVE,
  isActive: true,
  forcePasswordChange: false,
});

export const createAppUserDefaults = (input: CreateAppUserInput): Partial<User> => ({
  username: input.username,
  email: input.email,
  passwordHash: null,
  role: input.role,
  accountStatus: AccountStatus.PENDING_PASSWORD,
  isActive: true,
  forcePasswordChange: false,
});
