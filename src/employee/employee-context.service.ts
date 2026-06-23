import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtAccessPayload } from '../auth/interfaces/jwt-payload.interface';
import { UserRole } from '../database/enums';
import { Resource } from '../database/entities/resource.entity';

@Injectable()
export class EmployeeContextService {
  constructor(
    @InjectRepository(Resource)
    private readonly resources: Repository<Resource>,
  ) {}

  async requireResource(user: JwtAccessPayload): Promise<Resource> {
    if (user.role !== UserRole.EMPLOYEE) {
      throw new ForbiddenException('Employee role required');
    }
    const resource = await this.resources.findOne({
      where: { userId: user.sub, isActive: true },
      relations: { user: true },
    });
    if (!resource) {
      throw new NotFoundException('Employee resource profile not found');
    }
    if (!resource.user?.isActive) {
      throw new ForbiddenException('Employee account is inactive');
    }
    return resource;
  }
}
