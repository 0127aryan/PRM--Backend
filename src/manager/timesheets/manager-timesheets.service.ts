import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { JwtAccessPayload } from '../../auth/interfaces/jwt-payload.interface';
import { Resource } from '../../database/entities/resource.entity';
import { TimesheetEntry } from '../../database/entities/timesheet-entry.entity';
import { TimesheetWeek } from '../../database/entities/timesheet-week.entity';
import { ManagerContextService } from '../manager-context.service';

@Injectable()
export class ManagerTimesheetsService {
  constructor(
    private readonly managerContext: ManagerContextService,
    @InjectRepository(Resource)
    private readonly resources: Repository<Resource>,
    @InjectRepository(TimesheetWeek)
    private readonly weeks: Repository<TimesheetWeek>,
    @InjectRepository(TimesheetEntry)
    private readonly entries: Repository<TimesheetEntry>,
  ) {}

  async listForWeek(user: JwtAccessPayload, weekStart: string) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(weekStart)) {
      throw new BadRequestException('weekStart must be YYYY-MM-DD');
    }

    const manager = await this.managerContext.requireManagerUser(user);
    const reports = await this.resources.find({
      where: { reportingManagerId: manager.id, isActive: true },
      relations: { user: true },
    });
    if (!reports.length) {
      return { weekStart, items: [] };
    }

    const reportIds = reports.map((r) => r.id);
    const weeks = await this.weeks.find({
      where: { resourceId: In(reportIds), weekStart },
      relations: { resource: { user: true } },
    });

    const items = await Promise.all(
      weeks.map(async (week) => {
        const weekEntries = await this.entries.find({
          where: { timesheetWeekId: week.id },
          relations: { project: true, tags: { activityTag: true } },
        });
        const totalHours = weekEntries.reduce((s, e) => s + e.hours, 0);
        return {
          timesheetWeekId: week.id,
          employeeId: week.resourceId,
          employeeCode: week.resource?.user?.employeeCode,
          employeeName: week.resource?.user?.fullName,
          weekStart: week.weekStart,
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
      }),
    );

    const submittedIds = new Set(weeks.map((w) => w.resourceId));
    const missing = reports.filter((r) => !submittedIds.has(r.id));

    return {
      weekStart,
      items,
      missingSubmissions: missing.map((r) => ({
        employeeId: r.id,
        employeeCode: r.user?.employeeCode,
        fullName: r.user?.fullName,
      })),
    };
  }
}
