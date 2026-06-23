import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Allocation } from '../../database/entities/allocation.entity';

@Injectable()
export class AdminAllocationsService {
  constructor(
    @InjectRepository(Allocation)
    private readonly allocations: Repository<Allocation>,
  ) {}

  async list() {
    const rows = await this.allocations.find({
      relations: { resource: { user: true }, project: true },
      order: { id: 'DESC' },
    });
    return rows.map((a) => ({
      id: a.id,
      employeeId: a.resourceId,
      employeeCode: a.resource?.user?.employeeCode,
      employeeName: a.resource?.user?.fullName,
      projectId: a.projectId,
      projectName: a.project?.name,
      utilizationPct: a.utilizationPct,
      fromDate: a.fromDate,
      toDate: a.toDate,
      isActive: Boolean(a.isActive),
      createdAt: a.createdAt,
    }));
  }
}
