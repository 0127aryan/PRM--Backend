import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { JwtAccessPayload } from '../../auth/interfaces/jwt-payload.interface';
import { mondayOnOrBefore } from '../../common/utils/week-start.util';
import { Allocation } from '../../database/entities/allocation.entity';
import { TimesheetEntry } from '../../database/entities/timesheet-entry.entity';
import { TimesheetWeek } from '../../database/entities/timesheet-week.entity';
import { LlmRiskSummaryService } from '../../matching/llm-risk-summary.service';
import { LlmConfigService } from '../../llm/llm-config.service';
import { RiskSummaryService } from '../../matching/risk-summary.service';
import { ManagerMatchingService } from '../matching/manager-matching.service';
import { ManagerProjectsService } from '../projects/manager-projects.service';
import { AssistantRiskSummaryDto } from './dto/assistant-risk-summary.dto';
import { AssistantSkillMatchDto } from './dto/assistant-skill-match.dto';

@Injectable()
export class ManagerAssistantService {
  constructor(
    private readonly matching: ManagerMatchingService,
    private readonly projects: ManagerProjectsService,
    private readonly riskSummaryBuilder: RiskSummaryService,
    private readonly llmRiskSummary: LlmRiskSummaryService,
    private readonly llmConfig: LlmConfigService,
    @InjectRepository(Allocation)
    private readonly allocations: Repository<Allocation>,
    @InjectRepository(TimesheetWeek)
    private readonly weeks: Repository<TimesheetWeek>,
    @InjectRepository(TimesheetEntry)
    private readonly entries: Repository<TimesheetEntry>,
  ) {}

  skillMatch(user: JwtAccessPayload, dto: AssistantSkillMatchDto) {
    return this.matching.search(user, {
      projectId: dto.projectId,
      query: dto.query,
      keywords: dto.keywords,
      skillIds: dto.skillIds,
    });
  }

  async riskSummary(user: JwtAccessPayload, dto: AssistantRiskSummaryDto) {
    const project = await this.projects.findOne(user, dto.projectId);
    const flagsResult = await this.projects.riskFlags(user, dto.projectId);
    const template = this.riskSummaryBuilder.buildSummary({
      projectId: project.id,
      projectName: project.name,
      health: project.health,
      flags: flagsResult.flags,
    });

    const llmReady = await this.llmConfig.isConfigured();
    if (!llmReady) {
      return template;
    }

    const timesheetSummary = await this.buildTimesheetSummary(dto.projectId);
    return this.llmRiskSummary.buildSummary(
      {
        projectId: project.id,
        projectName: project.name,
        health: project.health,
        flags: flagsResult.flags,
        milestones: (project.milestones ?? []).map((m) => ({
          title: m.title,
          dueDate: m.dueDate,
          status: m.status,
        })),
        timesheetSummary,
      },
      template,
    );
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
      asOfDate: today,
    };
  }
}
