import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { JwtAccessPayload } from '../auth/interfaces/jwt-payload.interface';
import {
  assertMondayWeekStart,
  mondayOnOrBefore,
  recentMondayWeekStarts,
  weekEndFromStart,
} from '../common/utils/week-start.util';
import { TimesheetWeekStatus } from '../database/enums';
import { ActivityTag } from '../database/entities/activity-tag.entity';
import { Allocation } from '../database/entities/allocation.entity';
import { TimesheetEntry } from '../database/entities/timesheet-entry.entity';
import { TimesheetEntryTag } from '../database/entities/timesheet-entry-tag.entity';
import { TimesheetWeek } from '../database/entities/timesheet-week.entity';
import { SYSTEM_CONFIG_REPOSITORY } from '../database/repositories/repository.tokens';
import type { ISystemConfigRepository } from '../database/repositories/interfaces/system-config.repository.interface';
import { SubmitTimesheetDto } from './dto/submit-timesheet.dto';
import { EmployeeContextService } from './employee-context.service';

@Injectable()
export class EmployeeTimesheetsService {
  constructor(
    private readonly employeeContext: EmployeeContextService,
    private readonly dataSource: DataSource,
    @InjectRepository(TimesheetWeek)
    private readonly weeks: Repository<TimesheetWeek>,
    @InjectRepository(TimesheetEntry)
    private readonly entries: Repository<TimesheetEntry>,
    @InjectRepository(TimesheetEntryTag)
    private readonly entryTags: Repository<TimesheetEntryTag>,
    @InjectRepository(Allocation)
    private readonly allocations: Repository<Allocation>,
    @InjectRepository(ActivityTag)
    private readonly activityTags: Repository<ActivityTag>,
    @Inject(SYSTEM_CONFIG_REPOSITORY)
    private readonly systemConfig: ISystemConfigRepository,
  ) {}

  async submit(user: JwtAccessPayload, dto: SubmitTimesheetDto) {
    try {
      assertMondayWeekStart(dto.weekStart);
    } catch (e) {
      throw new BadRequestException(
        e instanceof Error ? e.message : 'Invalid weekStart',
      );
    }

    const resource = await this.employeeContext.requireResource(user);
    const weekEnd = weekEndFromStart(dto.weekStart);
    const today = new Date().toISOString().slice(0, 10);
    if (dto.weekStart > today) {
      throw new BadRequestException('Cannot submit timesheet for a future week');
    }

    const existing = await this.weeks.findOne({
      where: { resourceId: resource.id, weekStart: dto.weekStart },
    });
    if (existing?.status === TimesheetWeekStatus.SUBMITTED) {
      throw new ConflictException('Timesheet already submitted for this week');
    }

    const maxWeeklyHours = await this.getMaxWeeklyHours();
    const projectIds = new Set<number>();
    let totalHours = 0;

    for (const entry of dto.entries) {
      if (projectIds.has(entry.projectId)) {
        throw new BadRequestException(
          `Duplicate project ${entry.projectId} in the same week`,
        );
      }
      projectIds.add(entry.projectId);

      if (!Number.isInteger(entry.hours)) {
        throw new BadRequestException('Hours must be whole numbers');
      }

      const allocation = await this.findAllocationForWeek(
        resource.id,
        entry.projectId,
        dto.weekStart,
        weekEnd,
      );
      if (!allocation) {
        throw new BadRequestException(
          `No active allocation to project ${entry.projectId} for this week`,
        );
      }

      const maxProjectHours = Math.floor(
        (allocation.utilizationPct * maxWeeklyHours) / 100,
      );
      if (entry.hours > maxProjectHours) {
        throw new BadRequestException(
          `Project ${entry.projectId}: max ${maxProjectHours}h this week (${allocation.utilizationPct}% of ${maxWeeklyHours}h)`,
        );
      }

      await this.validateEntryTags(entry.tags);
      totalHours += entry.hours;
    }

    if (totalHours > maxWeeklyHours) {
      throw new BadRequestException(
        `Total weekly hours ${totalHours} exceeds limit ${maxWeeklyHours}`,
      );
    }

    if (totalHours === 0) {
      throw new BadRequestException('At least one entry must have hours > 0');
    }

    const submittedAt = new Date();

    await this.dataSource.transaction(async (manager) => {
      let week = existing;
      if (!week) {
        week = manager.create(TimesheetWeek, {
          resourceId: resource.id,
          weekStart: dto.weekStart,
          status: TimesheetWeekStatus.SUBMITTED,
          submittedAt,
        });
        week = await manager.save(week);
      } else {
        week.status = TimesheetWeekStatus.SUBMITTED;
        week.submittedAt = submittedAt;
        await manager.save(week);
        const oldEntries = await manager.find(TimesheetEntry, {
          where: { timesheetWeekId: week.id },
        });
        if (oldEntries.length) {
          const entryIds = oldEntries.map((e) => e.id);
          await manager.delete(TimesheetEntryTag, {
            timesheetEntryId: In(entryIds),
          });
          await manager.delete(TimesheetEntry, { timesheetWeekId: week.id });
        }
      }

      for (const entryDto of dto.entries) {
        if (entryDto.hours === 0) continue;
        const entry = await manager.save(
          manager.create(TimesheetEntry, {
            timesheetWeekId: week!.id,
            projectId: entryDto.projectId,
            hours: entryDto.hours,
          }),
        );
        for (const tagDto of entryDto.tags) {
          await manager.save(
            manager.create(TimesheetEntryTag, {
              timesheetEntryId: entry.id,
              activityTagId: tagDto.activityTagId ?? null,
              otherText: tagDto.otherText?.trim() ?? null,
            }),
          );
        }
      }
    });

    return this.getWeek(user, dto.weekStart);
  }

  async list(user: JwtAccessPayload, weekStart?: string) {
    const resource = await this.employeeContext.requireResource(user);
    if (weekStart) {
      try {
        assertMondayWeekStart(weekStart);
      } catch {
        throw new BadRequestException('weekStart must be a Monday (YYYY-MM-DD)');
      }
      const week = await this.weeks.findOne({
        where: { resourceId: resource.id, weekStart },
      });
      if (!week) {
        return { items: [] };
      }
      return { items: [await this.formatWeek(week)] };
    }

    const weeks = await this.weeks.find({
      where: { resourceId: resource.id },
      order: { weekStart: 'DESC' },
      take: 26,
    });
    return { items: await Promise.all(weeks.map((w) => this.formatWeek(w))) };
  }

  async getWeek(user: JwtAccessPayload, weekStart: string) {
    const resource = await this.employeeContext.requireResource(user);
    const week = await this.weeks.findOne({
      where: { resourceId: resource.id, weekStart },
    });
    if (!week) {
      throw new BadRequestException('Timesheet not found for this week');
    }
    return this.formatWeek(week);
  }

  async missedReminders(user: JwtAccessPayload) {
    const resource = await this.employeeContext.requireResource(user);
    const today = new Date().toISOString().slice(0, 10);
    const currentMonday = mondayOnOrBefore(today);
    const pastMondays = recentMondayWeekStarts(8).filter(
      (m) => m < currentMonday,
    );

    const submitted = await this.weeks.find({
      where: { resourceId: resource.id },
    });
    const byWeek = new Map(submitted.map((w) => [w.weekStart, w]));

    const reminders = pastMondays
      .map((weekStart) => {
        const row = byWeek.get(weekStart);
        if (row?.status === TimesheetWeekStatus.SUBMITTED) {
          return null;
        }
        return {
          weekStart,
          weekEnd: weekEndFromStart(weekStart),
          status: row?.status ?? 'NOT_SUBMITTED',
          message:
            row?.status === TimesheetWeekStatus.MISSED
              ? 'Timesheet marked as missed'
              : 'No timesheet submitted for this week',
        };
      })
      .filter(Boolean);

    return { reminders };
  }

  private async formatWeek(week: TimesheetWeek) {
    const weekEntries = await this.entries.find({
      where: { timesheetWeekId: week.id },
      relations: { project: true, tags: { activityTag: true } },
    });
    const totalHours = weekEntries.reduce((s, e) => s + e.hours, 0);
    return {
      timesheetWeekId: week.id,
      weekStart: week.weekStart,
      weekEnd: weekEndFromStart(week.weekStart),
      status: week.status,
      submittedAt: week.submittedAt,
      totalHours,
      entries: weekEntries.map((e) => ({
        id: e.id,
        projectId: e.projectId,
        projectName: e.project?.name,
        hours: e.hours,
        tags: (e.tags ?? []).map((t) => ({
          activityTagId: t.activityTagId,
          activityTagName: t.activityTag?.name,
          otherText: t.otherText,
        })),
      })),
    };
  }

  private async getMaxWeeklyHours(): Promise<number> {
    const row = await this.systemConfig.findByKey('max_weekly_hours');
    const value = row ? Number(row.configValue) : 40;
    if (!Number.isFinite(value) || value <= 0) {
      throw new BadRequestException(
        'system_config max_weekly_hours is invalid; set it in Admin settings',
      );
    }
    return value;
  }

  private async findAllocationForWeek(
    resourceId: number,
    projectId: number,
    weekStart: string,
    weekEnd: string,
  ) {
    return this.allocations
      .createQueryBuilder('a')
      .where('a.resource_id = :resourceId', { resourceId })
      .andWhere('a.project_id = :projectId', { projectId })
      .andWhere('a.is_active = :active', { active: true })
      .andWhere('a.from_date <= :weekEnd', { weekEnd })
      .andWhere('a.to_date >= :weekStart', { weekStart })
      .getOne();
  }

  private async validateEntryTags(
    tags: SubmitTimesheetDto['entries'][0]['tags'],
  ) {
    const activeTags = await this.activityTags.find({
      where: { isActive: true },
    });
    const tagById = new Map(activeTags.map((t) => [t.id, t]));

    for (const tag of tags) {
      const hasId = tag.activityTagId != null;
      const hasOther = Boolean(tag.otherText?.trim());
      if (!hasId && !hasOther) {
        throw new BadRequestException(
          'Each tag must have activityTagId or otherText',
        );
      }
      if (hasId && hasOther) {
        const meta = tagById.get(tag.activityTagId!);
        if (meta?.name.toLowerCase() !== 'other') {
          throw new BadRequestException(
            'otherText is only allowed with the Other activity tag',
          );
        }
      }
      if (hasId) {
        const meta = tagById.get(tag.activityTagId!);
        if (!meta) {
          throw new BadRequestException(`Invalid activity tag ${tag.activityTagId}`);
        }
        if (meta.name.toLowerCase() === 'other' && !hasOther) {
          throw new BadRequestException(
            'otherText (2–40 chars) is required when using the Other tag',
          );
        }
      }
    }
  }
}
