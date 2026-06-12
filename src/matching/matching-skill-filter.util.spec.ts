import { SkillCategory } from '../database/enums';
import { Proficiency, ResourceStatus, SkillCategory } from '../database/enums';
import {
  candidateHasRequiredSkillMatch,
  formatRequestedSkills,
  hasExplicitSkillTokens,
  hasSkillFilter,
} from './matching-skill-filter.util';
import { ParsedRequirement } from './parsed-requirement.types';

describe('matching-skill-filter.util', () => {
  const baseParsed: ParsedRequirement = {
    keywords: [],
    skillIds: [],
    skillCategories: [],
  };

  it('detects skill filters from keywords, ids, or categories', () => {
    expect(hasSkillFilter(baseParsed, ['nestjs'], [])).toBe(true);
    expect(hasSkillFilter(baseParsed, [], [10])).toBe(true);
    expect(
      hasSkillFilter(
        { ...baseParsed, skillCategories: [SkillCategory.BACKEND] },
        [],
        [],
      ),
    ).toBe(true);
    expect(hasSkillFilter(baseParsed, [], [])).toBe(false);
  });

  it('requires explicit keyword match when a technology is named', () => {
    const candidate = {
      employeeId: 1,
      employeeCode: 'EMP-017',
      fullName: 'Employee 7',
      status: ResourceStatus.BENCH,
      department: 'Software Engineering',
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

    const parsed = {
      ...baseParsed,
      skillCategories: [SkillCategory.BACKEND],
    };

    expect(
      candidateHasRequiredSkillMatch(candidate, parsed, ['coldfusion'], []),
    ).toBe(false);
    expect(
      candidateHasRequiredSkillMatch(candidate, parsed, ['nodejs'], []),
    ).toBe(true);
    expect(hasExplicitSkillTokens(['coldfusion'], [])).toBe(true);
  });

  it('formats requested skills for user-facing notices', () => {
    const label = formatRequestedSkills(
      { ...baseParsed, skillCategories: [SkillCategory.BACKEND] },
      ['nestjs', 'react'],
    );
    expect(label).toContain('nestjs');
    expect(label).toContain('react');
    expect(label).toContain('backend');
  });
});
