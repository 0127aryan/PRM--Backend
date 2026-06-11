import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtAccessPayload } from '../../auth/interfaces/jwt-payload.interface';
import { ResourceStatus } from '../../database/enums';
import { Allocation } from '../../database/entities/allocation.entity';
import { Project } from '../../database/entities/project.entity';
import { Resource } from '../../database/entities/resource.entity';
import { ManagerContextService } from '../manager-context.service';
import { CreateAllocationDto } from './dto/create-allocation.dto';
import { EndAllocationDto } from './dto/end-allocation.dto';
import { allocationRangesOverlap, maxDateOnly, toDateOnly } from './allocation-date.util';

@Injectable()
export class ManagerAllocationsService {
  constructor(
    private readonly managerContext: ManagerContextService,
    @InjectRepository(Allocation)
    private readonly allocations: Repository<Allocation>,
    @InjectRepository(Resource)
    private readonly resources: Repository<Resource>,
    @InjectRepository(Project)
    private readonly projects: Repository<Project>,
  ) {}

  async create(user: JwtAccessPayload, dto: CreateAllocationDto) {
    const manager = await this.managerContext.requireManagerUser(user);
    if (toDateOnly(dto.fromDate) > toDateOnly(dto.toDate)) {
      throw new BadRequestException('fromDate must be on or before toDate');
    }

    const resource = await this.resources.findOne({
      where: { id: dto.employeeId, isActive: true },
      relations: { user: true },
    });
    if (!resource) {
      throw new NotFoundException('Employee not found');
    }
    if (resource.reportingManagerId !== manager.id) {
      throw new ForbiddenException(
        'You can only allocate employees assigned to you as reporting manager',
      );
    }

    const project = await this.projects.findOne({ where: { id: dto.projectId } });
    if (!project) {
      throw new NotFoundException('Project not found');
    }
    if (project.managerId !== manager.id) {
      throw new ForbiddenException(
        'You can only allocate resources to projects you manage',
      );
    }

    await this.assertUtilizationCap(
      resource.id,
      dto.fromDate,
      dto.toDate,
      dto.utilizationPct,
    );

    const allocation = await this.allocations.save(
      this.allocations.create({
        resourceId: resource.id,
        projectId: dto.projectId,
        utilizationPct: dto.utilizationPct,
        fromDate: dto.fromDate,
        toDate: dto.toDate,
        isActive: true,
      }),
    );

    resource.status = ResourceStatus.ALLOCATED;
    await this.resources.save(resource);

    return this.toResponse(allocation);
  }

  async end(
    user: JwtAccessPayload,
    allocationId: number,
    dto: EndAllocationDto,
  ) {
    const manager = await this.managerContext.requireManagerUser(user);
    const allocation = await this.allocations.findOne({
      where: { id: allocationId },
      relations: { project: true, resource: true },
    });
    if (!allocation) {
      throw new NotFoundException('Allocation not found');
    }
    if (allocation.project.managerId !== manager.id) {
      throw new ForbiddenException('Allocation is not on your project');
    }

    const requestedEndDate = toDateOnly(dto.toDate ?? new Date());
    const startDate = toDateOnly(allocation.fromDate);
    const endDate = maxDateOnly(requestedEndDate, startDate);

    await this.allocations.update(allocation.id, {
      toDate: endDate,
      isActive: false,
    });
    allocation.toDate = endDate;
    allocation.isActive = false;

    const stillActive = await this.allocations
      .createQueryBuilder('a')
      .where('a.resource_id = :resourceId', { resourceId: allocation.resourceId })
      .andWhere('a.is_active = :active', { active: true })
      .getCount();
    if (stillActive === 0 && allocation.resource) {
      allocation.resource.status = ResourceStatus.BENCH;
      await this.resources.save(allocation.resource);
    }

    return { message: 'Allocation ended', allocation: this.toResponse(allocation) };
  }

  private async assertUtilizationCap(
    resourceId: number,
    fromDate: string,
    toDate: string,
    newPct: number,
    excludeId?: number,
  ) {
    const active = await this.allocations.find({
      where: { resourceId, isActive: true },
    });
    const overlapping = active.filter(
      (a) =>
        a.id !== excludeId &&
        allocationRangesOverlap(fromDate, toDate, a.fromDate, a.toDate),
    );
    const sum = overlapping.reduce((t, a) => t + a.utilizationPct, 0) + newPct;
    if (sum > 100) {
      throw new BadRequestException(
        `Total utilization would be ${sum}% (max 100%) for overlapping dates`,
      );
    }
  }

  private toResponse(allocation: Allocation) {
    return {
      id: allocation.id,
      employeeId: allocation.resourceId,
      projectId: allocation.projectId,
      utilizationPct: allocation.utilizationPct,
      fromDate: allocation.fromDate,
      toDate: allocation.toDate,
      isActive: Boolean(allocation.isActive),
    };
  }
}
