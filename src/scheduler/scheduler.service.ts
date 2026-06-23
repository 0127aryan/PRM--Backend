import { Injectable, Logger } from '@nestjs/common';
import { ResourceSyncService } from './resource-sync.service';
import { TimesheetAuditService } from './timesheet-audit.service';
import { ProjectHealthService } from './project-health.service';

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
    private readonly resourceSync: ResourceSyncService,
    private readonly timesheetAudit: TimesheetAuditService,
    private readonly projectHealth: ProjectHealthService,
  ) {}

  async run(): Promise<SchedulerRunResult> {
    if (this.running) {
      this.logger.warn(
        'Scheduler already running; skipping overlapping execution',
      );
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
      const employeeStatus = await this.resourceSync.syncResourceStatus();
      const missedTimesheets = await this.timesheetAudit.markMissedTimesheets();
      const projectHealth = await this.projectHealth.recomputeProjectHealth();
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
}
