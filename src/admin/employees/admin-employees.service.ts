import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ResourceStatus, UserRole } from '../../database/enums';
import { Resource } from '../../database/entities/resource.entity';
import { ResourceSkill } from '../../database/entities/resource-skill.entity';
import { User } from '../../database/entities/user.entity';
import { Skill } from '../../database/entities/skill.entity';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { SetEmployeeSkillsDto } from './dto/set-employee-skills.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';

@Injectable()
export class AdminEmployeesService {
  constructor(
    @InjectRepository(User)
    private readonly users: Repository<User>,
    @InjectRepository(Resource)
    private readonly resources: Repository<Resource>,
    @InjectRepository(ResourceSkill)
    private readonly resourceSkills: Repository<ResourceSkill>,
    @InjectRepository(Skill)
    private readonly skills: Repository<Skill>,
  ) {}

  async list() {
    const rows = await this.users.find({
      where: [{ role: UserRole.MANAGER }, { role: UserRole.EMPLOYEE }],
      relations: {
        resource: {
          reportingManager: true,
          resourceSkills: { skill: true },
        },
      },
      order: { id: 'ASC' },
    });
    return rows
      .filter((u) => Boolean(u.employeeCode))
      .map((u) => this.toResponse(u));
  }

  async findOne(id: number) {
    const { user } = await this.resolveProfile(id);
    return this.toResponse(user);
  }

  async create(dto: CreateEmployeeDto) {
    const user = await this.users.findOne({ where: { id: dto.userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (user.role === UserRole.ADMIN) {
      throw new BadRequestException(
        'Admin users do not have employee profiles',
      );
    }
    if (user.employeeCode) {
      throw new ConflictException('Profile already exists for this user');
    }
    if (
      await this.users.findOne({
        where: { employeeCode: dto.employeeCode.trim() },
      })
    ) {
      throw new ConflictException('Employee code already in use');
    }

    user.employeeCode = dto.employeeCode.trim();
    user.fullName = dto.fullName.trim();
    user.email = dto.email.trim().toLowerCase();
    user.department = dto.department.trim();
    user.designation = dto.designation.trim();
    await this.users.save(user);

    if (user.role === UserRole.EMPLOYEE) {
      const reportingManagerId = await this.resolveReportingManager(
        dto.reportingManagerId,
      );
      const resource = await this.resources.save(
        this.resources.create({
          userId: user.id,
          reportingManagerId,
          status: ResourceStatus.BENCH,
          isActive: true,
        }),
      );
      if (dto.skills?.length) {
        await this.replaceSkills(resource.id, dto.skills);
      }
      return this.findOne(resource.id);
    }

    return this.findOne(user.id);
  }

  async update(id: number, dto: UpdateEmployeeDto) {
    const { user, resource } = await this.resolveProfile(id);

    if (dto.reportingManagerId !== undefined) {
      if (user.role === UserRole.MANAGER) {
        throw new BadRequestException(
          'Managers cannot have a reporting manager',
        );
      }
      if (!resource) {
        throw new BadRequestException('Resource profile not found');
      }
      resource.reportingManagerId =
        dto.reportingManagerId === null
          ? null
          : await this.resolveReportingManager(dto.reportingManagerId);
      await this.resources.save(resource);
    }

    if (dto.fullName !== undefined) user.fullName = dto.fullName.trim();
    if (dto.department !== undefined) user.department = dto.department.trim();
    if (dto.designation !== undefined)
      user.designation = dto.designation.trim();
    await this.users.save(user);

    return this.findOne(id);
  }

  async setSkills(id: number, dto: SetEmployeeSkillsDto) {
    const { user, resource } = await this.resolveProfile(id);
    if (user.role !== UserRole.EMPLOYEE || !resource) {
      throw new BadRequestException('Skills apply only to employee role users');
    }
    await this.replaceSkills(resource.id, dto.skills);
    return this.findOne(id);
  }

  async deactivate(id: number) {
    const { user, resource } = await this.resolveProfile(id);
    if (user.role === UserRole.EMPLOYEE) {
      if (!resource) {
        throw new NotFoundException('Resource not found');
      }
      resource.isActive = false;
      await this.resources.save(resource);
    } else {
      user.isActive = false;
      await this.users.save(user);
    }
    return { message: 'Profile deactivated', id };
  }

  private async resolveProfile(id: number): Promise<{
    user: User;
    resource: Resource | null;
  }> {
    const resource = await this.resources.findOne({
      where: { id },
      relations: {
        user: true,
        reportingManager: true,
        resourceSkills: { skill: true },
      },
    });
    if (resource) {
      return { user: resource.user, resource };
    }

    const user = await this.users.findOne({
      where: { id, role: UserRole.MANAGER },
      relations: {
        resource: { reportingManager: true, resourceSkills: { skill: true } },
      },
    });
    if (!user?.employeeCode) {
      throw new NotFoundException('Profile not found');
    }
    return { user, resource: null };
  }

  private async resolveReportingManager(
    reportingManagerId: number | undefined,
  ): Promise<number> {
    if (!reportingManagerId) {
      throw new BadRequestException(
        'reportingManagerId is required for employees',
      );
    }
    const manager = await this.users.findOne({
      where: { id: reportingManagerId, role: UserRole.MANAGER, isActive: true },
    });
    if (!manager?.employeeCode) {
      throw new BadRequestException(
        'reportingManagerId must be an active manager',
      );
    }
    return manager.id;
  }

  private async replaceSkills(
    resourceId: number,
    skills: CreateEmployeeDto['skills'],
  ) {
    await this.resourceSkills.delete({ resourceId });
    if (!skills?.length) return;

    for (const item of skills) {
      const skill = await this.skills.findOne({ where: { id: item.skillId } });
      if (!skill) {
        throw new BadRequestException(`Skill id ${item.skillId} not found`);
      }
      await this.resourceSkills.save(
        this.resourceSkills.create({
          resourceId,
          skillId: item.skillId,
          proficiency: item.proficiency,
        }),
      );
    }
  }

  private toResponse(user: User) {
    const resource = user.resource;
    const isEmployee = user.role === UserRole.EMPLOYEE;
    return {
      id: isEmployee ? (resource?.id ?? user.id) : user.id,
      employeeCode: user.employeeCode,
      userId: user.id,
      fullName: user.fullName,
      email: user.email,
      department: user.department,
      designation: user.designation,
      reportingManagerId: resource?.reportingManagerId ?? null,
      reportingManagerName: resource?.reportingManager?.fullName ?? null,
      status: resource?.status ?? null,
      isActive: isEmployee
        ? Boolean(resource?.isActive)
        : Boolean(user.isActive),
      userRole: user.role,
      skills: (resource?.resourceSkills ?? []).map((rs) => ({
        skillId: rs.skillId,
        skillName: rs.skill?.name,
        proficiency: rs.proficiency,
      })),
      createdAt: isEmployee ? resource?.createdAt : user.createdAt,
      updatedAt: isEmployee ? resource?.updatedAt : user.updatedAt,
    };
  }
}
