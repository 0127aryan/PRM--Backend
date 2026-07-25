import { ProjectHealth } from '../database/enums';
import { RiskSummaryService } from './risk-summary.service';

describe('RiskSummaryService', () => {
  const service = new RiskSummaryService();

  it('builds AT_RISK narrative and recommendations', () => {
    const result = service.buildSummary({
      projectId: 1,
      projectName: 'Alpha',
      health: ProjectHealth.AT_RISK,
      flags: [
        {
          code: 'MILESTONE_OVERDUE',
          message: 'Milestone "Release" is past due',
          milestoneId: 5,
        },
      ],
    });

    expect(result.mode).toBe('keyword');
    expect(result.summary).toContain('AT_RISK');
    expect(result.recommendations.length).toBeGreaterThan(0);
  });

  it('reports on track when no flags', () => {
    const result = service.buildSummary({
      projectId: 2,
      projectName: 'Beta',
      health: ProjectHealth.ON_TRACK,
      flags: [],
    });

    expect(result.summary).toContain('on track');
  });
});
