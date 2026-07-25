import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ResourceStatus } from '../database/enums';
import { Resource } from '../database/entities/resource.entity';
import { Allocation } from '../database/entities/allocation.entity';

@Injectable()
export class ResourceSyncService {
  private readonly logger = new Logger(ResourceSyncService.name);

  constructor(
    @InjectRepository(Resource)
    private readonly resources: Repository<Resource>,
    @InjectRepository(Allocation)
    private readonly allocations: Repository<Allocation>,
  ) {}

  async syncResourceStatus(): Promise<{ updated: number }> {
    const today = new Date().toISOString().slice(0, 10);
    const activeResources = await this.resources.find({
      where: { isActive: true },
    });
    let updated = 0;

    for (const resource of activeResources) {
      const hasActiveAllocation = await this.allocations
        .createQueryBuilder('a')
        .where('a.resource_id = :resourceId', { resourceId: resource.id })
        .andWhere('a.is_active = :active', { active: true })
        .andWhere('a.from_date <= :today', { today })
        .andWhere('a.to_date >= :today', { today })
        .getCount();

      const nextStatus = hasActiveAllocation
        ? ResourceStatus.ALLOCATED
        : ResourceStatus.BENCH;

      if (resource.status !== nextStatus) {
        resource.status = nextStatus;
        await this.resources.save(resource);
        updated += 1;
      }
    }

    return { updated };
  }
}
