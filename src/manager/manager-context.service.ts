import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtAccessPayload } from '../auth/interfaces/jwt-payload.interface';
import { UserRole } from '../database/enums';
import { User } from '../database/entities/user.entity';

@Injectable()
export class ManagerContextService {
  constructor(
    @InjectRepository(User)
    private readonly users: Repository<User>,
  ) {}

  async requireManagerUser(user: JwtAccessPayload): Promise<User> {
    if (user.role !== UserRole.MANAGER) {
      throw new ForbiddenException('Manager role required');
    }
    const manager = await this.users.findOne({ where: { id: user.sub } });
    if (!manager || !manager.isActive) {
      throw new NotFoundException('Manager profile not found');
    }
    if (!manager.employeeCode || !manager.fullName) {
      throw new NotFoundException('Manager profile is incomplete');
    }
    return manager;
  }
}
