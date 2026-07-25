import { Proficiency, ResourceStatus, SkillCategory } from '../database/enums';
import { parseRequirement } from './parse-requirement.util';

describe('parseRequirement', () => {
  it('parses bench status, intermediate proficiency, and backend category', () => {
    const parsed = parseRequirement(
      'I need a Backend developer with intermediate level of skills and should be on bench',
    );

    expect(parsed.requiredStatus).toBe(ResourceStatus.BENCH);
    expect(parsed.minProficiency).toBe(Proficiency.INTERMEDIATE);
    expect(parsed.skillCategories).toContain(SkillCategory.BACKEND);
    expect(parsed.keywords).not.toContain('on');
  });

  it('does not treat "on" from "on bench" as a skill keyword', () => {
    const parsed = parseRequirement('developer on bench with react');
    expect(parsed.requiredStatus).toBe(ResourceStatus.BENCH);
    expect(parsed.keywords).not.toContain('on');
  });

  it('parses "benched" as bench status', () => {
    const parsed = parseRequirement(
      'I want a backend developer who is benched',
    );

    expect(parsed.requiredStatus).toBe(ResourceStatus.BENCH);
    expect(parsed.skillCategories).toContain(SkillCategory.BACKEND);
    expect(parsed.keywords).not.toContain('benched');
    expect(parsed.keywords).not.toContain('is');
  });

  it('parses "who is benched" as bench-only status filter', () => {
    const parsed = parseRequirement('who is benched');

    expect(parsed.requiredStatus).toBe(ResourceStatus.BENCH);
    expect(parsed.skillCategories).toHaveLength(0);
    expect(parsed.keywords).toHaveLength(0);
  });

  it('parses allocation percentage from natural language', () => {
    const parsed = parseRequirement(
      'I need a backend developer with 60% allocation needed',
    );

    expect(parsed.requiredUtilizationPct).toBe(60);
    expect(parsed.skillCategories).toContain(SkillCategory.BACKEND);
  });
});
