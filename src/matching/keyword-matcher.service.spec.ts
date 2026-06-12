import { ResourceStatus, Proficiency, SkillCategory } from '../database/enums';
import { KeywordMatcherService } from './keyword-matcher.service';
import { parseRequirement } from './parse-requirement.util';

describe('KeywordMatcherService', () => {
  const matcher = new KeywordMatcherService();

  const base = {
    employeeId: 1,
    employeeCode: 'EMP-001',
    fullName: 'Alex Dev',
    status: ResourceStatus.BENCH,
    department: 'Engineering',
    availableUtilizationPct: 100,
    skills: [
      {
        skillId: 10,
        skillName: 'NestJS',
        skillCategory: SkillCategory.BACKEND,
        proficiency: Proficiency.ADVANCED,
      },
      {
        skillId: 11,
        skillName: 'React',
        skillCategory: SkillCategory.FRONTEND,
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
          skillCategory: SkillCategory.QA,
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
    const results = matcher.rankMatches([nodeDev], ['backend', 'nodejs'], []);
    expect(results).toHaveLength(1);
    expect(results[0].matchedSkills.some((s) => s.skillName === 'Node.js')).toBe(true);
  });

  it('returns all direct reports when no filter', () => {
    const results = matcher.rankMatches([base], [], []);
    expect(results).toHaveLength(1);
    expect(results[0].reasons).toContain(
      'Listed as your direct report (no search filter applied)',
    );
  });

  it('requires bench status and intermediate backend skills from parsed requirement', () => {
    const allocated = {
      ...base,
      employeeId: 1,
      status: ResourceStatus.ALLOCATED,
      skills: [
        {
          skillId: 1,
          skillName: 'Python',
          skillCategory: SkillCategory.BACKEND,
          proficiency: Proficiency.INTERMEDIATE,
        },
      ],
    };
    const benchBeginner = {
      ...base,
      employeeId: 2,
      employeeCode: 'EMP-015',
      fullName: 'Sam',
      status: ResourceStatus.BENCH,
      skills: [
        {
          skillId: 2,
          skillName: 'Node.js',
          skillCategory: SkillCategory.BACKEND,
          proficiency: Proficiency.BEGINNER,
        },
      ],
    };
    const benchIntermediate = {
      ...base,
      employeeId: 3,
      employeeCode: 'EMP-020',
      fullName: 'Riya',
      status: ResourceStatus.BENCH,
      skills: [
        {
          skillId: 3,
          skillName: 'Java',
          skillCategory: SkillCategory.BACKEND,
          proficiency: Proficiency.INTERMEDIATE,
        },
      ],
    };

    const parsed = parseRequirement(
      'Backend developer with intermediate level and should be on bench',
    );
    const results = matcher.rankMatches(
      [allocated, benchBeginner, benchIntermediate],
      parsed.keywords,
      [],
      parsed,
    );

    expect(results).toHaveLength(1);
    expect(results[0].employeeId).toBe(3);
    expect(results[0].status).toBe(ResourceStatus.BENCH);
  });

  it('returns no matches when a named technology is absent from profiles', () => {
    const nodeDev = {
      ...base,
      skills: [
        {
          skillId: 2,
          skillName: 'Node.js',
          skillCategory: SkillCategory.BACKEND,
          proficiency: Proficiency.INTERMEDIATE,
        },
      ],
    };

    const parsed = parseRequirement('I need a coldfusion developer');
    const results = matcher.rankMatches(
      [nodeDev],
      parsed.keywords,
      [],
      parsed,
    );

    expect(parsed.keywords).toContain('coldfusion');
    expect(results).toHaveLength(0);
  });

  it('excludes fully allocated employees when utilization is required', () => {
    const fullyAllocated = {
      ...base,
      employeeId: 1,
      status: ResourceStatus.ALLOCATED,
      availableUtilizationPct: 0,
      skills: [
        {
          skillId: 1,
          skillName: 'Node.js',
          skillCategory: SkillCategory.BACKEND,
          proficiency: Proficiency.ADVANCED,
        },
      ],
    };
    const partiallyAvailable = {
      ...base,
      employeeId: 2,
      employeeCode: 'EMP-017',
      fullName: 'Employee 7',
      status: ResourceStatus.BENCH,
      availableUtilizationPct: 100,
      skills: [
        {
          skillId: 2,
          skillName: 'Node.js',
          skillCategory: SkillCategory.BACKEND,
          proficiency: Proficiency.INTERMEDIATE,
        },
      ],
    };

    const parsed = parseRequirement(
      'I need a backend developer with 60% allocation needed',
    );
    const results = matcher.rankMatches(
      [fullyAllocated, partiallyAvailable],
      parsed.keywords,
      [],
      parsed,
    );

    expect(parsed.requiredUtilizationPct).toBe(60);
    expect(results).toHaveLength(1);
    expect(results[0].employeeId).toBe(2);
  });
});
