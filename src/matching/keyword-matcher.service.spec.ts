import { ResourceStatus, Proficiency, SkillCategory } from '../database/enums';
import { KeywordMatcherService } from './keyword-matcher.service';

describe('KeywordMatcherService', () => {
  const matcher = new KeywordMatcherService();

  const base = {
    employeeId: 1,
    employeeCode: 'EMP-001',
    fullName: 'Alex Dev',
    status: ResourceStatus.BENCH,
    department: 'Engineering',
    skills: [
      {
        skillId: 10,
        skillName: 'NestJS',
        proficiency: Proficiency.ADVANCED,
      },
      {
        skillId: 11,
        skillName: 'React',
        proficiency: Proficiency.INTERMEDIATE,
      },
    ],
  };

  it('ranks NestJS keyword match above non-match', () => {
    const results = matcher.rankMatches([base], ['nestjs'], []);
    expect(results).toHaveLength(1);
    expect(results[0].score).toBeGreaterThan(0);
    expect(results[0].matchedSkills.some((s) => s.skillName === 'NestJS')).toBe(true);
    expect(results[0].reasons.some((r) => r.includes('nestjs'))).toBe(true);
  });

  it('filters out non-matching employees when filters applied', () => {
    const other = {
      ...base,
      employeeId: 2,
      employeeCode: 'EMP-002',
      fullName: 'Bob',
      skills: [
        {
          skillId: 99,
          skillName: 'QA Testing',
          proficiency: Proficiency.BEGINNER,
        },
      ],
    };
    const results = matcher.rankMatches([base, other], ['nestjs'], []);
    expect(results).toHaveLength(1);
    expect(results[0].employeeId).toBe(1);
  });

  it('matches Node.js when keyword is nodejs', () => {
    const nodeDev = {
      ...base,
      skills: [
        {
          skillId: 1,
          skillName: 'Node.js',
          skillCategory: SkillCategory.BACKEND,
          proficiency: Proficiency.INTERMEDIATE,
        },
      ],
    };
    const results = matcher.rankMatches([nodeDev], ['backend', 'nodejs', 'developer'], []);
    expect(results).toHaveLength(1);
    expect(results[0].matchedSkills.some((s) => s.skillName === 'Node.js')).toBe(true);
    expect(results[0].reasons.some((r) => r.includes('nodejs'))).toBe(true);
  });

  it('returns all direct reports when no filter', () => {
    const results = matcher.rankMatches([base], [], []);
    expect(results).toHaveLength(1);
    expect(results[0].reasons).toContain(
      'Listed as your direct report (no search filter applied)',
    );
  });
});
