import { ProjectHealth } from '../database/enums';
import { LlmClientService } from '../llm/llm-client.service';
import { LlmRiskSummaryService } from './llm-risk-summary.service';

describe('LlmRiskSummaryService', () => {
  const llm = {
    complete: jest.fn(),
  } as unknown as LlmClientService;

  const service = new LlmRiskSummaryService(llm);

  const fallback = {
    projectId: 1,
    projectName: 'Alpha',
    health: ProjectHealth.AT_RISK,
    mode: 'keyword' as const,
    summary: 'Overall health: AT_RISK.',
    flags: [],
    recommendations: ['Review milestones'],
  };

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('returns LLM narrative when the model succeeds', async () => {
    (llm.complete as jest.Mock).mockResolvedValue(
      'The Alpha project is at risk because a milestone is overdue.',
    );

    const result = await service.buildSummary(
      {
        projectId: 1,
        projectName: 'Alpha',
        health: ProjectHealth.AT_RISK,
        flags: [],
        milestones: [],
        timesheetSummary: {
          lastWeekStart: '2026-06-02',
          totalHoursLogged: 12,
          allocatedTeamSize: 2,
          missingSubmissions: 1,
          recentActivityTags: ['API'],
        },
      },
      fallback,
    );

    expect(result.mode).toBe('llm');
    expect(result.summary).toContain('milestone');
    expect(result.recommendations).toEqual(fallback.recommendations);
  });

  it('falls back to rule-based summary when LLM fails', async () => {
    (llm.complete as jest.Mock).mockRejectedValue(new Error('API down'));

    const result = await service.buildSummary(
      {
        projectId: 1,
        projectName: 'Alpha',
        health: ProjectHealth.AT_RISK,
        flags: [],
        milestones: [],
        timesheetSummary: {
          lastWeekStart: '2026-06-02',
          totalHoursLogged: 0,
          allocatedTeamSize: 0,
          missingSubmissions: 0,
          recentActivityTags: [],
        },
      },
      fallback,
    );

    expect(result.summary).toContain('AI summary unavailable');
    expect(result.recommendations).toEqual(fallback.recommendations);
  });
});
