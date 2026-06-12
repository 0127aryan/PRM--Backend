import { Injectable } from '@nestjs/common';
import { ProjectHealth } from '../database/enums';

export interface RiskFlag {
  code: string;
  message: string;
  milestoneId?: number;
}

export type RiskSummaryMode = 'keyword' | 'llm';

export interface RiskSummaryResult {
  projectId: number;
  projectName: string;
  health: ProjectHealth;
  mode: RiskSummaryMode;
  summary: string;
  flags: RiskFlag[];
  recommendations: string[];
}

@Injectable()
export class RiskSummaryService {
  buildSummary(input: {
    projectId: number;
    projectName: string;
    health: ProjectHealth;
    flags: RiskFlag[];
  }): RiskSummaryResult {
    const recommendations: string[] = [];

    if (input.health === ProjectHealth.AT_RISK) {
      recommendations.push(
        'Review overdue milestones and confirm allocated staff are logging sufficient hours.',
      );
      recommendations.push(
        'Consider rebalancing allocation or escalating blockers to the admin.',
      );
    } else if (input.health === ProjectHealth.ATTENTION) {
      recommendations.push(
        'Monitor upcoming milestone dates and follow up on partial timesheet coverage.',
      );
    } else {
      recommendations.push('No immediate action required; continue routine check-ins.');
    }

    for (const flag of input.flags) {
      if (flag.code === 'MILESTONE_OVERDUE') {
        recommendations.push(`Close or update milestone status for: ${flag.message}`);
      }
      if (flag.code === 'MILESTONE_DUE_SOON') {
        recommendations.push(`Start work on: ${flag.message}`);
      }
    }

    const summary = this.buildNarrative(input.health, input.flags);

    return {
      projectId: input.projectId,
      projectName: input.projectName,
      health: input.health,
      mode: 'keyword',
      summary,
      flags: input.flags,
      recommendations: [...new Set(recommendations)],
    };
  }

  private buildNarrative(health: ProjectHealth, flags: RiskFlag[]): string {
    if (flags.length === 0 && health === ProjectHealth.ON_TRACK) {
      return 'Project is on track with no rule-based risk flags at this time.';
    }

    const parts: string[] = [`Overall health: ${health}.`];
    if (flags.length > 0) {
      parts.push(
        `Active flags (${flags.length}): ${flags.map((f) => f.message).join('; ')}.`,
      );
    }
    return parts.join(' ');
  }
}
