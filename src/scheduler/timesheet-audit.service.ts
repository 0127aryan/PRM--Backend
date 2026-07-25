import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  lastCompletedWeekMonday,
  weekEndFromStart,
} from '../common/utils/week-start.util';
import {
  TimesheetWeekStatus,
  AccountStatus,
  UserRole,
} from '../database/enums';
import { Allocation } from '../database/entities/allocation.entity';
import { Resource } from '../database/entities/resource.entity';
import { TimesheetWeek } from '../database/entities/timesheet-week.entity';
import { User } from '../database/entities/user.entity';
import { RefreshToken } from '../database/entities/refresh-token.entity';
import { MailService } from '../mail/mail.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class TimesheetAuditService {
  private readonly logger = new Logger(TimesheetAuditService.name);

  constructor(
    @InjectRepository(Resource)
    private readonly resources: Repository<Resource>,
    @InjectRepository(Allocation)
    private readonly allocations: Repository<Allocation>,
    @InjectRepository(TimesheetWeek)
    private readonly weeks: Repository<TimesheetWeek>,
    @InjectRepository(User)
    private readonly users: Repository<User>,
    @InjectRepository(RefreshToken)
    private readonly refreshTokens: Repository<RefreshToken>,
    private readonly mailService: MailService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async markMissedTimesheets(): Promise<{ marked: number; weekStart: string }> {
    const today = new Date().toISOString().slice(0, 10);
    const weekStart = lastCompletedWeekMonday(today);
    const activeResources = await this.resources.find({
      where: { isActive: true },
      relations: { user: true },
    });
    let marked = 0;

    for (const resource of activeResources) {
      const weekEnd = weekEndFromStart(weekStart);
      const hasAllocThisWeek = await this.allocations
        .createQueryBuilder('a')
        .where('a.resource_id = :resourceId', { resourceId: resource.id })
        .andWhere('a.is_active = :active', { active: true })
        .andWhere('a.from_date <= :weekEnd', { weekEnd })
        .andWhere('a.to_date >= :weekStart', { weekStart })
        .getCount();

      if (hasAllocThisWeek === 0) {
        // Bench Protection: Skip if no active allocations during this week
        continue;
      }

      const existing = await this.weeks.findOne({
        where: { resourceId: resource.id, weekStart },
      });

      let newlyMarkedMissed = false;
      if (!existing) {
        await this.weeks.save(
          this.weeks.create({
            resourceId: resource.id,
            weekStart,
            status: TimesheetWeekStatus.MISSED,
            submittedAt: null,
          }),
        );
        marked += 1;
        newlyMarkedMissed = true;
      } else if (
        existing.status !== TimesheetWeekStatus.SUBMITTED &&
        existing.status !== TimesheetWeekStatus.MISSED
      ) {
        existing.status = TimesheetWeekStatus.MISSED;
        existing.submittedAt = null;
        await this.weeks.save(existing);
        marked += 1;
        newlyMarkedMissed = true;
      }

      // Check if previous week was also missed
      const prevD = new Date(`${weekStart}T00:00:00Z`);
      prevD.setUTCDate(prevD.getUTCDate() - 7);
      const prevWeekStart = prevD.toISOString().slice(0, 10);
      const prevWeekEnd = weekEndFromStart(prevWeekStart);

      const hasAllocPrevWeek = await this.allocations
        .createQueryBuilder('a')
        .where('a.resource_id = :resourceId', { resourceId: resource.id })
        .andWhere('a.is_active = :active', { active: true })
        .andWhere('a.from_date <= :prevWeekEnd', { prevWeekEnd })
        .andWhere('a.to_date >= :prevWeekStart', { prevWeekStart })
        .getCount();

      const prevExisting = await this.weeks.findOne({
        where: { resourceId: resource.id, weekStart: prevWeekStart },
      });

      const prevWeekMissed =
        hasAllocPrevWeek > 0 &&
        (!prevExisting || prevExisting.status === TimesheetWeekStatus.MISSED);

      const user = resource.user;
      if (prevWeekMissed) {
        // 2+ consecutive misses! Freeze the account if not already frozen
        if (user && user.accountStatus !== AccountStatus.FROZEN) {
          user.accountStatus = AccountStatus.FROZEN;
          await this.users.save(user);
          this.logger.log(
            `Resource ${resource.id} (User ${user.id}) frozen due to consecutive misses: ${weekStart} & ${prevWeekStart}`,
          );

          // Force logout: delete all refresh tokens for this user
          await this.refreshTokens.delete({ userId: user.id });

          // Create In-App Notifications
          await this.notificationsService.createNotification(
            user.id,
            'Account Frozen',
            'Your account has been frozen due to 2 consecutive missed timesheets. Please contact your manager or administrator to unfreeze.',
            'ACCOUNT_FREEZE',
          );

          if (resource.reportingManagerId) {
            await this.notificationsService.createNotification(
              resource.reportingManagerId,
              'Direct Report Account Frozen',
              `${user.fullName || user.username} has been frozen due to 2 consecutive missed timesheets.`,
              'ACCOUNT_FREEZE',
            );
          }

          const admins = await this.users.find({
            where: { role: UserRole.ADMIN },
          });
          for (const admin of admins) {
            await this.notificationsService.createNotification(
              admin.id,
              'User Account Frozen',
              `${user.fullName || user.username}'s account has been frozen due to 2 consecutive missed timesheets.`,
              'ACCOUNT_FREEZE',
            );
          }

          // Send warning email
          await this.mailService.sendFreezeEmail(
            user.email,
            user.fullName || user.username,
            2,
          );
        }
      } else if (newlyMarkedMissed) {
        // Single week miss -> Send warning notifications and emails
        if (user && user.accountStatus !== AccountStatus.FROZEN) {
          await this.notificationsService.createNotification(
            user.id,
            'Timesheet Warning',
            `You missed submitting your timesheet for week starting ${weekStart}. Submit it immediately to avoid account freeze.`,
            'TIMESHEET_WARNING',
          );

          if (resource.reportingManagerId) {
            await this.notificationsService.createNotification(
              resource.reportingManagerId,
              'Direct Report Timesheet Warning',
              `${user.fullName || user.username} missed submitting their timesheet for week starting ${weekStart}.`,
              'TIMESHEET_WARNING',
            );
          }

          await this.mailService.sendWarningEmail(
            user.email,
            user.fullName || user.username,
            weekStart,
          );
        }
      }
    }

    return { marked, weekStart };
  }
}
