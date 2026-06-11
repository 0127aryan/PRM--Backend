import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtAccessPayload } from '../../auth/interfaces/jwt-payload.interface';
import {
  isMilestoneDueSoon,
  isMilestoneOverdue,
} from '../../common/utils/milestone-risk.util';
import { ProjectHealth } from '../../database/enums';
import { Allocation } from '../../database/entities/allocation.entity';
import { Milestone } from '../../database/entities/milestone.entity';
import { Project } from '../../database/entities/project.entity';
import { ManagerContextService } from '../manager-context.service';
import { UpdateProjectStatusDto } from './dto/update-project-status.dto';

@Injectable()
export class ManagerProjectsService {
  constructor(
    private readonly managerContext: ManagerContextService,
    @InjectRepository(Project)
    private readonly projects: Repository<Project>,
    @InjectRepository(Milestone)
    private readonly milestones: Repository<Milestone>,
    @InjectRepository(Allocation)
    private readonly allocations: Repository<Allocation>,
  ) {}

  async list(user: JwtAccessPayload) {
    const manager = await this.managerContext.requireManagerUser(user);
    const rows = await this.projects.find({
      where: { managerId: manager.id },
      relations: { milestones: true },
      order: { id: 'ASC' },
    });
    const teamSizeByProject = await this.activeTeamCounts(
      rows.map((p) => p.id),
    );
    return rows.map((p) => ({
      ...this.toSummary(p),
      teamSize: teamSizeByProject[p.id] ?? 0,
    }));
  }

  async findOne(user: JwtAccessPayload, projectId: number) {
    const project = await this.getOwnedProject(user, projectId);
    const activeAllocations = await this.allocations
      .createQueryBuilder('a')
      .leftJoinAndSelect('a.resource', 'resource')
      .leftJoinAndSelect('resource.user', 'user')
      .where('a.project_id = :projectId', { projectId })
      .andWhere('a.is_active = :active', { active: true })
      .getMany();
    return {
      ...this.toSummary(project),
      milestones: (project.milestones ?? []).map((m) => ({
        id: m.id,
        title: m.title,
        dueDate: m.dueDate,
        status: m.status,
      })),
      allocations: activeAllocations.map((a) => ({
        id: a.id,
        employeeId: a.resourceId,
        employeeCode: a.resource?.user?.employeeCode,
        employeeName: a.resource?.user?.fullName,
        utilizationPct: a.utilizationPct,
        fromDate: a.fromDate,
        toDate: a.toDate,
      })),
    };
  }

  async updateStatus(
    user: JwtAccessPayload,
    projectId: number,
    dto: UpdateProjectStatusDto,
  ) {
    const project = await this.getOwnedProject(user, projectId);
    project.status = dto.status;
    await this.projects.save(project);
    return this.toSummary(project);
  }

  async riskFlags(user: JwtAccessPayload, projectId: number) {
    const project = await this.getOwnedProject(user, projectId);
    const today = new Date().toISOString().slice(0, 10);
    const inSevenDays = new Date(Date.now() + 7 * 86_400_000)
      .toISOString()
      .slice(0, 10);
    const flags: { code: string; message: string; milestoneId?: number }[] = [];

    for (const m of project.milestones ?? []) {
      if (isMilestoneOverdue(m, today)) {
        flags.push({
          code: 'MILESTONE_OVERDUE',
          message: `Milestone "${m.title}" is past due`,
          milestoneId: m.id,
        });
      } else if (isMilestoneDueSoon(m, today, inSevenDays)) {
        flags.push({
          code: 'MILESTONE_DUE_SOON',
          message: `Milestone "${m.title}" is due within 7 days`,
          milestoneId: m.id,
        });
      }
    }

    if (project.health === ProjectHealth.AT_RISK) {
      flags.push({
        code: 'PROJECT_AT_RISK',
        message: 'Project health is AT_RISK (scheduler or rules)',
      });
    } else if (project.health === ProjectHealth.ATTENTION) {
      flags.push({
        code: 'PROJECT_ATTENTION',
        message: 'Project health needs attention',
      });
    }

    return { projectId, health: project.health, flags };
  }

  private async getOwnedProject(
    user: JwtAccessPayload,
    projectId: number,
  ): Promise<Project> {
    const manager = await this.managerContext.requireManagerUser(user);
    const project = await this.projects.findOne({
      where: { id: projectId },
      relations: { milestones: true },
    });
    if (!project) {
      throw new NotFoundException('Project not found');
    }
    if (project.managerId !== manager.id) {
      throw new ForbiddenException('Project is not assigned to you');
    }
    return project;
  }

  private async activeTeamCounts(
    projectIds: number[],
  ): Promise<Record<number, number>> {
    if (projectIds.length === 0) return {};
    const raw = await this.allocations
      .createQueryBuilder('a')
      .select('a.project_id', 'projectId')
      .addSelect('COUNT(*)', 'count')
      .where('a.project_id IN (:...ids)', { ids: projectIds })
      .andWhere('a.is_active = :active', { active: true })
      .groupBy('a.project_id')
      .getRawMany<{ projectId: string; count: string }>();
    return Object.fromEntries(
      raw.map((r) => [Number(r.projectId), Number(r.count)]),
    );
  }

  private toSummary(project: Project) {
    return {
      id: project.id,
      name: project.name,
      description: project.description,
      startDate: project.startDate,
      endDate: project.endDate,
      status: project.status,
      health: project.health,
      managerId: project.managerId,
      milestoneCount: project.milestones?.length ?? 0,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    };
  }
}
