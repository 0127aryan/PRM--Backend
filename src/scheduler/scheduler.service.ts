import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { isMilestoneDueSoon, isMilestoneOverdue } from '../common/utils/milestone-risk.util';
import {
  lastCompletedWeekMonday,
  weekEndFromStart,
  recentMondayWeekStarts,
  mondayOnOrBefore,
} from '../common/utils/week-start.util';
import {
  ProjectHealth,
  ResourceStatus,
  TimesheetWeekStatus,
  AccountStatus,
  UserRole,
} from '../database/enums';
import { Allocation } from '../database/entities/allocation.entity';
import { Milestone } from '../database/entities/milestone.entity';
import { Project } from '../database/entities/project.entity';
import { Resource } from '../database/entities/resource.entity';
import { TimesheetEntry } from '../database/entities/timesheet-entry.entity';
import { TimesheetWeek } from '../database/entities/timesheet-week.entity';
import { User } from '../database/entities/user.entity';
import { RefreshToken } from '../database/entities/refresh-token.entity';
import { SYSTEM_CONFIG_REPOSITORY } from '../database/repositories/repository.tokens';
import type { ISystemConfigRepository } from '../database/repositories/interfaces/system-config.repository.interface';
import { MailService } from '../mail/mail.service';
import { NotificationsService } from '../notifications/notifications.service';
import { RiskSummaryService } from '../matching/risk-summary.service';
import { LlmRiskSummaryService } from '../matching/llm-risk-summary.service';
import { LlmConfigService } from '../llm/llm-config.service';
import { LlmClientService } from '../llm/llm-client.service';
import { availableUtilizationOnDate } from '../matching/allocation-availability.util';

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
    @InjectRepository(User)
    private readonly users: Repository<User>,
    @InjectRepository(RefreshToken)
    private readonly refreshTokens: Repository<RefreshToken>,
    @Inject(SYSTEM_CONFIG_REPOSITORY)
    private readonly systemConfig: ISystemConfigRepository,
    private readonly mailService: MailService,
    private readonly notificationsService: NotificationsService,
    private readonly riskSummaryBuilder: RiskSummaryService,
    private readonly llmRiskSummary: LlmRiskSummaryService,
    private readonly llmConfig: LlmConfigService,
    private readonly llmClient: LlmClientService,
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

          const admins = await this.users.find({ where: { role: UserRole.ADMIN } });
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
        const transitionToRisk = project.health !== ProjectHealth.AT_RISK && health === ProjectHealth.AT_RISK;
        project.health = health;
        await this.projects.save(project);
        updated += 1;

        if (transitionToRisk) {
          try {
            await this.sendProjectAtRiskNotification(project);
          } catch (err) {
            this.logger.error(`Failed to send risk email for project ${project.id}:`, err);
          }
        }
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

  private async buildTimesheetSummary(projectId: number) {
    const today = new Date().toISOString().slice(0, 10);
    const lastWeekStart = mondayOnOrBefore(
      new Date(Date.now() - 7 * 86_400_000).toISOString().slice(0, 10),
    );

    const activeAllocations = await this.allocations.find({
      where: { projectId, isActive: true },
    });
    const resourceIds = activeAllocations.map((a) => a.resourceId);

    let totalHoursLogged = 0;
    let missingSubmissions = resourceIds.length;
    const tagSet = new Set<string>();

    if (resourceIds.length > 0) {
      const weeks = await this.weeks.find({
        where: { resourceId: In(resourceIds), weekStart: lastWeekStart },
      });
      missingSubmissions = resourceIds.length - weeks.length;

      if (weeks.length > 0) {
        const weekIds = weeks.map((w) => w.id);
        const projectEntries = await this.entries.find({
          where: { timesheetWeekId: In(weekIds), projectId },
          relations: { tags: { activityTag: true } },
        });
        totalHoursLogged = projectEntries.reduce((sum, e) => sum + e.hours, 0);
        for (const entry of projectEntries) {
          for (const tag of entry.tags ?? []) {
            const name = tag.activityTag?.name ?? tag.otherText;
            if (name) tagSet.add(name);
          }
        }
      }
    }

    return {
      lastWeekStart,
      totalHoursLogged,
      allocatedTeamSize: resourceIds.length,
      missingSubmissions,
      recentActivityTags: [...tagSet].slice(0, 10),
    };
  }

  private extractJson(raw: string): string {
    const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenced?.[1]) {
      return fenced[1].trim();
    }
    const start = raw.indexOf('{');
    const end = raw.lastIndexOf('}');
    if (start >= 0 && end > start) {
      return raw.slice(start, end + 1);
    }
    return raw.trim();
  }

  private async getSuggestedHelp(
    project: Project,
    flags: any[],
    aiRiskSummary: string,
  ): Promise<Array<{ fullName: string; availableUtilizationPct: number; skills: string[]; reason: string }>> {
    const candidates = await this.resources.find({
      where: { reportingManagerId: project.managerId, isActive: true },
      relations: ['user', 'resourceSkills', 'resourceSkills.skill', 'allocations'],
    });

    const candidatesWithAvailability = candidates.map((r) => {
      const activeAllocations = (r.allocations ?? []).filter((a) => a.isActive);
      const availablePct = availableUtilizationOnDate(activeAllocations);
      return {
        resourceId: r.id,
        fullName: r.user?.fullName ?? r.user?.username ?? 'Unknown',
        skills: (r.resourceSkills ?? []).map((rs) => rs.skill?.name).filter(Boolean) as string[],
        availableUtilizationPct: availablePct,
      };
    });

    const availableCandidates = candidatesWithAvailability.filter(
      (c) => c.availableUtilizationPct > 0,
    );

    if (availableCandidates.length === 0) {
      return [];
    }

    const llmReady = await this.llmConfig.isConfigured();
    if (llmReady) {
      try {
        const prompt = [
          'You are a resource management AI assistant for an IT services company.',
          'A project is currently AT_RISK. We want to find employees whose skills can help reduce this risk.',
          'Given the project details, the risk flags, the risk summary, and a list of available direct reports (candidates) with their skills and available utilization, select up to 3 candidates who are the best fit to join the team or help out.',
          'Provide the suggestions in JSON format strictly matching the schema below. Do not output any markdown blocks (e.g. ```json) or extra text.',
          '',
          `Project Name: ${project.name}`,
          `Project Description: ${project.description || 'No description available'}`,
          `Risk Flags: ${JSON.stringify(flags)}`,
          `Risk Summary: ${aiRiskSummary}`,
          `Candidates: ${JSON.stringify(availableCandidates.slice(0, 15))}`,
          '',
          'JSON Schema:',
          '{',
          '  "suggestions": [',
          '    {',
          '      "resourceId": number,',
          '      "fullName": "string",',
          '      "skills": ["string"],',
          '      "availableUtilizationPct": number,',
          '      "reason": "string" // concise explanation of why their skills can reduce this project risk (max 12 words)',
          '    }',
          '  ]',
          '}',
        ].join('\n');

        const raw = await this.llmClient.complete(prompt, { jsonMode: true, temperature: 0.2 });
        const jsonText = this.extractJson(raw);
        const parsed = JSON.parse(jsonText);
        if (parsed && Array.isArray(parsed.suggestions)) {
          return parsed.suggestions.map((s: any) => ({
            fullName: String(s.fullName),
            availableUtilizationPct: Number(s.availableUtilizationPct) || 0,
            skills: Array.isArray(s.skills) ? s.skills.map(String) : [],
            reason: String(s.reason),
          }));
        }
      } catch (err) {
        this.logger.warn('AI Suggested Help failed, using rule-based fallback:', err);
      }
    }

    // Fallback: match candidates by comparing their skills to project details
    const searchTokens = [
      project.name,
      project.description ?? '',
      ...(project.milestones ?? []).map((m) => m.title),
    ]
      .join(' ')
      .toLowerCase();

    const scored = availableCandidates.map((c) => {
      let score = 0;
      const matched = [];
      for (const skill of c.skills) {
        if (searchTokens.includes(skill.toLowerCase())) {
          score += 10;
          matched.push(skill);
        }
      }
      score += c.availableUtilizationPct / 10;
      return { ...c, score, matched };
    });

    scored.sort((a, b) => b.score - a.score);

    return scored.slice(0, 3).map((c) => {
      const skillsStr = c.matched.length > 0 ? c.matched.join(', ') : 'General skills';
      return {
        fullName: c.fullName,
        availableUtilizationPct: c.availableUtilizationPct,
        skills: c.skills,
        reason: c.matched.length > 0 
          ? `Possesses matching skills: ${skillsStr} with ${c.availableUtilizationPct}% availability.`
          : `Available direct report with ${c.availableUtilizationPct}% utilization to support project workload.`,
      };
    });
  }

  private async sendProjectAtRiskNotification(project: Project) {
    let projectWithRelations = project;
    if (!project.manager || !project.milestones) {
      projectWithRelations = await this.projects.findOne({
        where: { id: project.id },
        relations: ['manager', 'milestones'],
      }) ?? project;
    }

    const manager = projectWithRelations.manager;
    if (!manager || !manager.email) {
      this.logger.warn(`Cannot send project risk notification for project ${project.id}: Manager email not found`);
      return;
    }

    const today = new Date().toISOString().slice(0, 10);
    const inSevenDays = new Date(Date.now() + 7 * 86_400_000)
      .toISOString()
      .slice(0, 10);
    const flags: { code: string; message: string; milestoneId?: number }[] = [];

    for (const m of projectWithRelations.milestones ?? []) {
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

    if (projectWithRelations.health === ProjectHealth.AT_RISK) {
      flags.push({
        code: 'PROJECT_AT_RISK',
        message: 'Project health is AT_RISK',
      });
    }

    const fallbackTemplate = this.riskSummaryBuilder.buildSummary({
      projectId: project.id,
      projectName: project.name,
      health: project.health,
      flags: flags,
    });

    let aiRiskSummary = fallbackTemplate.summary;
    const llmReady = await this.llmConfig.isConfigured();
    if (llmReady) {
      try {
        const timesheetSummary = await this.buildTimesheetSummary(project.id);
        const result = await this.llmRiskSummary.buildSummary(
          {
            projectId: project.id,
            projectName: project.name,
            health: project.health,
            flags: flags,
            milestones: (projectWithRelations.milestones ?? []).map((m) => ({
              title: m.title,
              dueDate: m.dueDate,
              status: m.status,
            })),
            timesheetSummary,
          },
          fallbackTemplate,
        );
        aiRiskSummary = result.summary;
      } catch (err) {
        this.logger.warn('AI Risk Summary generation failed for risk email:', err);
      }
    }

    const suggestions = await this.getSuggestedHelp(projectWithRelations, flags, aiRiskSummary);

    await this.mailService.sendProjectAtRiskEmail(
      manager.email,
      manager.fullName || manager.username,
      project.name,
      project.id,
      project.health,
      aiRiskSummary,
      (projectWithRelations.milestones ?? []).map((m) => ({
        title: m.title,
        dueDate: m.dueDate,
        status: m.status,
      })),
      suggestions,
    );
    this.logger.log(`Project risk notification sent to manager ${manager.email} for project "${project.name}"`);
  }
}
