import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MilestoneStatus, ProjectStatus, UserRole } from '../../database/enums';
import { Milestone } from '../../database/entities/milestone.entity';
import { Project } from '../../database/entities/project.entity';
import { User } from '../../database/entities/user.entity';
import { CreateMilestoneDto } from './dto/create-milestone.dto';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateMilestoneDto } from './dto/update-milestone.dto';
import { UpdateProjectDto } from './dto/update-project.dto';

@Injectable()
export class AdminProjectsService {
  constructor(
    @InjectRepository(Project)
    private readonly projects: Repository<Project>,
    @InjectRepository(Milestone)
    private readonly milestones: Repository<Milestone>,
    @InjectRepository(User)
    private readonly users: Repository<User>,
  ) {}

  async list() {
    const rows = await this.projects.find({
      relations: { manager: true, milestones: true },
      order: { id: 'ASC' },
    });
    return rows.map((p) => this.toProjectResponse(p));
  }

  async findOne(id: number) {
    const project = await this.getProjectOrThrow(id);
    return this.toProjectResponse(project);
  }

  async create(dto: CreateProjectDto) {
    this.assertDateRange(dto.startDate, dto.endDate);
    await this.assertManager(dto.managerId);

    const project = await this.projects.save(
      this.projects.create({
        name: dto.name.trim(),
        description: dto.description?.trim() ?? null,
        startDate: dto.startDate,
        endDate: dto.endDate,
        status: dto.status ?? ProjectStatus.PLANNED,
        managerId: dto.managerId,
      }),
    );
    return this.findOne(project.id);
  }

  async update(id: number, dto: UpdateProjectDto) {
    const project = await this.getProjectOrThrow(id);
    const startDate = dto.startDate ?? project.startDate;
    const endDate = dto.endDate ?? project.endDate;
    this.assertDateRange(startDate, endDate);

    if (dto.managerId !== undefined) {
      await this.assertManager(dto.managerId);
      project.managerId = dto.managerId;
    }
    if (dto.name !== undefined) project.name = dto.name.trim();
    if (dto.description !== undefined) {
      project.description = dto.description?.trim() ?? null;
    }
    if (dto.startDate !== undefined) project.startDate = dto.startDate;
    if (dto.endDate !== undefined) project.endDate = dto.endDate;
    if (dto.status !== undefined) project.status = dto.status;

    await this.projects.save(project);
    return this.findOne(id);
  }

  async addMilestone(projectId: number, dto: CreateMilestoneDto) {
    await this.getProjectOrThrow(projectId);
    const milestone = await this.milestones.save(
      this.milestones.create({
        projectId,
        title: dto.title.trim(),
        dueDate: dto.dueDate,
        status: dto.status ?? MilestoneStatus.NOT_STARTED,
      }),
    );
    return milestone;
  }

  async updateMilestone(
    projectId: number,
    milestoneId: number,
    dto: UpdateMilestoneDto,
  ) {
    const milestone = await this.milestones.findOne({
      where: { id: milestoneId, projectId },
    });
    if (!milestone) {
      throw new NotFoundException('Milestone not found');
    }
    if (dto.title !== undefined) milestone.title = dto.title.trim();
    if (dto.dueDate !== undefined) milestone.dueDate = dto.dueDate;
    if (dto.status !== undefined) milestone.status = dto.status;
    return this.milestones.save(milestone);
  }

  private async getProjectOrThrow(id: number): Promise<Project> {
    const project = await this.projects.findOne({
      where: { id },
      relations: { manager: true, milestones: true },
    });
    if (!project) {
      throw new NotFoundException('Project not found');
    }
    return project;
  }

  private async assertManager(managerId: number) {
    const manager = await this.users.findOne({
      where: { id: managerId, role: UserRole.MANAGER, isActive: true },
    });
    if (!manager?.employeeCode) {
      throw new BadRequestException('managerId must be an active manager user');
    }
  }

  private assertDateRange(startDate: string, endDate: string) {
    if (startDate > endDate) {
      throw new BadRequestException('startDate must be on or before endDate');
    }
  }

  private toProjectResponse(project: Project) {
    return {
      id: project.id,
      name: project.name,
      description: project.description,
      startDate: project.startDate,
      endDate: project.endDate,
      status: project.status,
      health: project.health,
      managerId: project.managerId,
      managerName: project.manager?.fullName ?? null,
      managerCode: project.manager?.employeeCode ?? null,
      milestones: (project.milestones ?? []).map((m) => ({
        id: m.id,
        title: m.title,
        dueDate: m.dueDate,
        status: m.status,
      })),
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    };
  }
}
