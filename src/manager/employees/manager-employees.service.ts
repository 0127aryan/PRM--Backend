import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtAccessPayload } from '../../auth/interfaces/jwt-payload.interface';
import { Allocation } from '../../database/entities/allocation.entity';
import { Resource } from '../../database/entities/resource.entity';
import { ManagerContextService } from '../manager-context.service';

@Injectable()
export class ManagerEmployeesService {
  constructor(
    private readonly managerContext: ManagerContextService,
    @InjectRepository(Resource)
    private readonly resources: Repository<Resource>,
    @InjectRepository(Allocation)
    private readonly allocations: Repository<Allocation>,
  ) {}

  async listDirectReports(user: JwtAccessPayload) {
    const manager = await this.managerContext.requireManagerUser(user);
    const reports = await this.resources.find({
      where: { reportingManagerId: manager.id, isActive: true },
      relations: { user: true, resourceSkills: { skill: true } },
      order: { user: { fullName: 'ASC' } },
    });
    return Promise.all(reports.map((r) => this.toEmployeeCard(r)));
  }

  async findDirectReport(user: JwtAccessPayload, employeeId: number) {
    const resource = await this.getDirectReport(user, employeeId);
    const activeAllocations = await this.allocations.find({
      where: { resourceId: resource.id, isActive: true },
      relations: { project: true },
    });
    return {
      ...(await this.toEmployeeCard(resource)),
      allocations: activeAllocations.map((a) => ({
        id: a.id,
        projectId: a.projectId,
        projectName: a.project?.name,
        utilizationPct: a.utilizationPct,
        fromDate: a.fromDate,
        toDate: a.toDate,
      })),
      skills: (resource.resourceSkills ?? []).map((rs) => ({
        skillId: rs.skillId,
        skillName: rs.skill?.name,
        proficiency: rs.proficiency,
      })),
    };
  }

  private async getDirectReport(
    user: JwtAccessPayload,
    employeeId: number,
  ): Promise<Resource> {
    const manager = await this.managerContext.requireManagerUser(user);
    const resource = await this.resources.findOne({
      where: { id: employeeId },
      relations: { user: true, resourceSkills: { skill: true } },
    });
    if (!resource || !resource.isActive) {
      throw new NotFoundException('Employee not found');
    }
    if (resource.reportingManagerId !== manager.id) {
      throw new ForbiddenException('Employee is not your direct report');
    }
    return resource;
  }

  private async toEmployeeCard(resource: Resource) {
    const activeAllocation = await this.allocations.findOne({
      where: { resourceId: resource.id, isActive: true },
      relations: { project: true },
      order: { fromDate: 'DESC' },
    });
    const profile = resource.user;
    return {
      id: resource.id,
      employeeCode: profile?.employeeCode,
      fullName: profile?.fullName,
      email: profile?.email,
      department: profile?.department,
      designation: profile?.designation,
      status: resource.status,
      currentProjectId: activeAllocation?.projectId ?? null,
      currentProjectName: activeAllocation?.project?.name ?? null,
      skillCount: resource.resourceSkills?.length ?? 0,
    };
  }
}
