import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AccountStatus } from '../../enums';
import { User } from '../../entities/user.entity';
import {
  CreateAdminUserInput,
  CreateAppUserInput,
  createAdminDefaults,
  createAppUserDefaults,
  IUserRepository,
  UpdateUserPasswordInput,
} from '../interfaces/user.repository.interface';

@Injectable()
export class TypeOrmUserRepository implements IUserRepository {
  constructor(
    @InjectRepository(User)
    private readonly repo: Repository<User>,
  ) {}

  findByUsername(username: string): Promise<User | null> {
    return this.repo.findOne({ where: { username } });
  }

  findByEmail(email: string): Promise<User | null> {
    return this.repo.findOne({
      where: { email },
      relations: { resource: true },
    });
  }

  findById(id: number): Promise<User | null> {
    return this.repo.findOne({ where: { id } });
  }

  findByIdWithResource(id: number): Promise<User | null> {
    return this.repo.findOne({
      where: { id },
      relations: { resource: true },
    });
  }

  findAll(): Promise<User[]> {
    return this.repo.find({
      relations: { resource: true },
      order: { id: 'ASC' },
    });
  }

  createAdmin(input: CreateAdminUserInput): Promise<User> {
    const entity = this.repo.create(createAdminDefaults(input));
    return this.repo.save(entity);
  }

  createAppUser(input: CreateAppUserInput): Promise<User> {
    const entity = this.repo.create(createAppUserDefaults(input));
    return this.repo.save(entity);
  }

  async updatePassword(
    userId: number,
    input: UpdateUserPasswordInput,
  ): Promise<void> {
    await this.repo.update(userId, {
      passwordHash: input.passwordHash,
      ...(input.accountStatus !== undefined && {
        accountStatus: input.accountStatus,
      }),
      ...(input.forcePasswordChange !== undefined && {
        forcePasswordChange: input.forcePasswordChange,
      }),
    });
  }

  setActive(userId: number, isActive: boolean): Promise<void> {
    return this.repo.update(userId, { isActive }).then(() => undefined);
  }

  updateAccountStatus(userId: number, status: AccountStatus): Promise<void> {
    return this.repo
      .update(userId, { accountStatus: status })
      .then(() => undefined);
  }
}
