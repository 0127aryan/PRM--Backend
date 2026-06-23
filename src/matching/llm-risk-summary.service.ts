import { Injectable, Logger } from '@nestjs/common';
import { ProjectHealth } from '../database/enums';
import { LlmClientService } from '../llm/llm-client.service';
import { RiskFlag, RiskSummaryResult } from './risk-summary.service';

export interface RiskSummaryContext {
  projectId: number;
  projectName: string;
  health: ProjectHealth;
  flags: RiskFlag[];
  milestones: Array<{ title: string; dueDate: string; status: string }>;
  timesheetSummary: {
    lastWeekStart: string;
    totalHoursLogged: number;
    allocatedTeamSize: number;
    missingSubmissions: number;
    recentActivityTags: string[];
  };
}

@Injectable()
export class LlmRiskSummaryService {
  private readonly logger = new Logger(LlmRiskSummaryService.name);

  constructor(private readonly llm: LlmClientService) {}

  async buildSummary(
    input: RiskSummaryContext,
    fallback: RiskSummaryResult,
  ): Promise<RiskSummaryResult> {
    try {
      const prompt = this.buildPrompt(input);
      const summary = await this.llm.complete(prompt, { temperature: 0.3 });
      return {
        ...fallback,
        mode: 'llm',
        summary: summary.trim(),
      };
    } catch (error) {
      this.logger.warn(
        `LLM risk summary failed, using rule-based fallback: ${
          error instanceof Error ? error.message : 'unknown error'
        }`,
      );
      return {
        ...fallback,
        summary: `${fallback.summary} (AI summary unavailable; showing rule-based analysis.)`,
      };
    }
  }

  private buildPrompt(input: RiskSummaryContext): string {
    return [
      'You are a project health analyst for an IT services company.',
      'Write a concise plain-English risk summary (2-4 sentences) for a manager.',
      'Mention overdue or upcoming milestones, timesheet gaps, and overall health.',
      'Do not use bullet points or markdown.',
      '',
      `Project: ${input.projectName}`,
      `Health: ${input.health}`,
      `Risk flags: ${JSON.stringify(input.flags)}`,
      `Milestones: ${JSON.stringify(input.milestones)}`,
      `Timesheet summary: ${JSON.stringify(input.timesheetSummary)}`,
    ].join('\n');
  }
}
