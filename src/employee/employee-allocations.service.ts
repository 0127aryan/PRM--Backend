import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtAccessPayload } from '../auth/interfaces/jwt-payload.interface';
import { Allocation } from '../database/entities/allocation.entity';
import { EmployeeContextService } from './employee-context.service';

@Injectable()
export class EmployeeAllocationsService {
  constructor(
    private readonly employeeContext: EmployeeContextService,
    @InjectRepository(Allocation)
    private readonly allocations: Repository<Allocation>,
  ) {}

  async listMine(user: JwtAccessPayload) {
    const resource = await this.employeeContext.requireResource(user);
    const rows = await this.allocations.find({
      where: { resourceId: resource.id, isActive: true },
      relations: { project: { manager: true } },
      order: { fromDate: 'DESC' },
    });
    return rows.map((a) => ({
      id: a.id,
      projectId: a.projectId,
      projectName: a.project?.name,
      projectStatus: a.project?.status,
      managerId: a.project?.managerId ?? null,
      managerName: a.project?.manager?.fullName ?? null,
      managerEmail: a.project?.manager?.email ?? null,
      utilizationPct: a.utilizationPct,
      fromDate: a.fromDate,
      toDate: a.toDate,
    }));
  }
}
