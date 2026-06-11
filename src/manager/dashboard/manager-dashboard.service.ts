import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtAccessPayload } from '../../auth/interfaces/jwt-payload.interface';
import { ResourceStatus, ProjectHealth } from '../../database/enums';
import { Project } from '../../database/entities/project.entity';
import { Resource } from '../../database/entities/resource.entity';
import { ManagerContextService } from '../manager-context.service';
import { ManagerEmployeesService } from '../employees/manager-employees.service';

@Injectable()
export class ManagerDashboardService {
  constructor(
    private readonly managerContext: ManagerContextService,
    private readonly employeesService: ManagerEmployeesService,
    @InjectRepository(Project)
    private readonly projects: Repository<Project>,
    @InjectRepository(Resource)
    private readonly resources: Repository<Resource>,
  ) {}

  async getDashboard(user: JwtAccessPayload) {
    const manager = await this.managerContext.requireManagerUser(user);
    const myProjects = await this.projects.find({
      where: { managerId: manager.id },
    });
    const directReports = await this.employeesService.listDirectReports(user);

    const benchCompanyWide = await this.resources.find({
      where: { status: ResourceStatus.BENCH, isActive: true },
      relations: { user: true },
      order: { user: { fullName: 'ASC' } },
      take: 50,
    });

    const healthCounts: Record<ProjectHealth, number> = {
      [ProjectHealth.ON_TRACK]: 0,
      [ProjectHealth.ATTENTION]: 0,
      [ProjectHealth.AT_RISK]: 0,
    };
    for (const p of myProjects) {
      healthCounts[p.health] += 1;
    }

    return {
      manager: {
        employeeId: manager.id,
        employeeCode: manager.employeeCode,
        fullName: manager.fullName,
      },
      projects: {
        total: myProjects.length,
        byHealth: healthCounts,
      },
      directReports: {
        total: directReports.length,
        bench: directReports.filter((e) => e.status === ResourceStatus.BENCH).length,
        allocated: directReports.filter((e) => e.status === ResourceStatus.ALLOCATED)
          .length,
        items: directReports,
      },
      companyBenchPreview: benchCompanyWide.map((r) => ({
        id: r.id,
        employeeCode: r.user?.employeeCode,
        fullName: r.user?.fullName,
        department: r.user?.department,
        isDirectReport: r.reportingManagerId === manager.id,
      })),
    };
  }

  async getEmployeeDetail(user: JwtAccessPayload, employeeId: number) {
    return this.employeesService.findDirectReport(user, employeeId);
  }
}
