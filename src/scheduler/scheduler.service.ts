import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { isMilestoneDueSoon, isMilestoneOverdue } from '../common/utils/milestone-risk.util';
import {
  lastCompletedWeekMonday,
  weekEndFromStart,
} from '../common/utils/week-start.util';
import {
  ProjectHealth,
  ResourceStatus,
  TimesheetWeekStatus,
} from '../database/enums';
import { Allocation } from '../database/entities/allocation.entity';
import { Milestone } from '../database/entities/milestone.entity';
import { Project } from '../database/entities/project.entity';
import { Resource } from '../database/entities/resource.entity';
import { TimesheetEntry } from '../database/entities/timesheet-entry.entity';
import { TimesheetWeek } from '../database/entities/timesheet-week.entity';
import { SYSTEM_CONFIG_REPOSITORY } from '../database/repositories/repository.tokens';
import type { ISystemConfigRepository } from '../database/repositories/interfaces/system-config.repository.interface';

export interface SchedulerRunResult {
  startedAt: string;
  finishedAt: string;
  employeeStatus: { updated: number };
  missedTimesheets: { marked: number; weekStart: string };
  projectHealth: { updated: number };
}

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);
  private running = false;

  constructor(
    @InjectRepository(Resource)
    private readonly resources: Repository<Resource>,
    @InjectRepository(Allocation)
    private readonly allocations: Repository<Allocation>,
    @InjectRepository(TimesheetWeek)
    private readonly weeks: Repository<TimesheetWeek>,
    @InjectRepository(TimesheetEntry)
    private readonly entries: Repository<TimesheetEntry>,
    @InjectRepository(Project)
    private readonly projects: Repository<Project>,
    @InjectRepository(Milestone)
    private readonly milestones: Repository<Milestone>,
    @Inject(SYSTEM_CONFIG_REPOSITORY)
    private readonly systemConfig: ISystemConfigRepository,
  ) {}

  async run(): Promise<SchedulerRunResult> {
    if (this.running) {
      this.logger.warn('Scheduler already running; skipping overlapping execution');
      return {
        startedAt: new Date().toISOString(),
        finishedAt: new Date().toISOString(),
        employeeStatus: { updated: 0 },
        missedTimesheets: { marked: 0, weekStart: '' },
        projectHealth: { updated: 0 },
      };
    }

    this.running = true;
    const startedAt = new Date().toISOString();
    try {
      const employeeStatus = await this.syncResourceStatus();
      const missedTimesheets = await this.markMissedTimesheets();
      const projectHealth = await this.recomputeProjectHealth();
      const result: SchedulerRunResult = {
        startedAt,
        finishedAt: new Date().toISOString(),
        employeeStatus,
        missedTimesheets,
        projectHealth,
      };
      this.logger.log(`Scheduler completed: ${JSON.stringify(result)}`);
      return result;
    } finally {
      this.running = false;
    }
  }

  private async syncResourceStatus(): Promise<{ updated: number }> {
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

  private async markMissedTimesheets(): Promise<{
    marked: number;
    weekStart: string;
  }> {
    const today = new Date().toISOString().slice(0, 10);
    const weekStart = lastCompletedWeekMonday(today);
    const activeResources = await this.resources.find({
      where: { isActive: true },
    });
    let marked = 0;

    for (const resource of activeResources) {
      const existing = await this.weeks.findOne({
        where: { resourceId: resource.id, weekStart },
      });
      if (existing?.status === TimesheetWeekStatus.SUBMITTED) {
        continue;
      }
      if (existing?.status === TimesheetWeekStatus.MISSED) {
        continue;
      }

      if (existing) {
        existing.status = TimesheetWeekStatus.MISSED;
        existing.submittedAt = null;
        await this.weeks.save(existing);
      } else {
        await this.weeks.save(
          this.weeks.create({
            resourceId: resource.id,
            weekStart,
            status: TimesheetWeekStatus.MISSED,
            submittedAt: null,
          }),
        );
      }
      marked += 1;
    }

    return { marked, weekStart };
  }

  private async recomputeProjectHealth(): Promise<{ updated: number }> {
    const today = new Date().toISOString().slice(0, 10);
    const inSevenDays = new Date(Date.now() + 7 * 86_400_000)
      .toISOString()
      .slice(0, 10);
    const lastWeekMonday = lastCompletedWeekMonday(today);
    const lastWeekEnd = weekEndFromStart(lastWeekMonday);
    const maxWeeklyHours = await this.getMaxWeeklyHours();

    const allProjects = await this.projects.find();
    let updated = 0;

    for (const project of allProjects) {
      let health = ProjectHealth.ON_TRACK;

      const milestones = await this.milestones.find({
        where: { projectId: project.id },
      });
      for (const m of milestones) {
        if (isMilestoneOverdue(m, today)) {
          health = ProjectHealth.AT_RISK;
          break;
        }
      }

      if (health !== ProjectHealth.AT_RISK) {
        for (const m of milestones) {
          if (isMilestoneDueSoon(m, today, inSevenDays)) {
            health = ProjectHealth.ATTENTION;
            break;
          }
        }
      }

      if (health !== ProjectHealth.AT_RISK) {
        const weekAllocations = await this.allocations
          .createQueryBuilder('a')
          .where('a.project_id = :projectId', { projectId: project.id })
          .andWhere('a.is_active = :active', { active: true })
          .andWhere('a.from_date <= :lastWeekEnd', { lastWeekEnd })
          .andWhere('a.to_date >= :lastWeekMonday', { lastWeekMonday })
          .getMany();

        for (const allocation of weekAllocations) {
          const expected = Math.floor(
            (allocation.utilizationPct * maxWeeklyHours) / 100,
          );
          if (expected <= 0) continue;

          const actual = await this.sumHoursForWeek(
            allocation.resourceId,
            project.id,
            lastWeekMonday,
          );
          const ratio = actual / expected;
          if (ratio < 0.5) {
            health = ProjectHealth.AT_RISK;
            break;
          }
          if (ratio < 0.8) {
            health = ProjectHealth.ATTENTION;
          }
        }
      }

      if (project.health !== health) {
        project.health = health;
        await this.projects.save(project);
        updated += 1;
      }
    }

    return { updated };
  }

  private async sumHoursForWeek(
    resourceId: number,
    projectId: number,
    weekStart: string,
  ): Promise<number> {
    const week = await this.weeks.findOne({
      where: { resourceId, weekStart, status: TimesheetWeekStatus.SUBMITTED },
    });
    if (!week) return 0;

    const rows = await this.entries.find({
      where: { timesheetWeekId: week.id, projectId },
    });
    return rows.reduce((sum, e) => sum + e.hours, 0);
  }

  private async getMaxWeeklyHours(): Promise<number> {
    const row = await this.systemConfig.findByKey('max_weekly_hours');
    const value = row ? Number(row.configValue) : 40;
    return Number.isFinite(value) && value > 0 ? value : 40;
  }
}
