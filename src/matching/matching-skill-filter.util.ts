import { SkillCategory } from '../database/enums';
import { normalizeMatchToken, tokensMatch } from './matching-normalize.util';
import { EmployeeMatchCandidate } from './matching.types';
import { ParsedRequirement } from './parsed-requirement.types';

export function hasSkillFilter(
  parsed: ParsedRequirement | undefined,
  keywords: string[],
  skillIds: number[],
): boolean {
  return (
    keywords.length > 0 ||
    skillIds.length > 0 ||
    (parsed?.skillCategories.length ?? 0) > 0
  );
}

/** Specific technologies or catalog skill ids — category alone is not enough. */
export function hasExplicitSkillTokens(
  keywords: string[],
  skillIds: number[],
): boolean {
  return (
    keywords.map((k) => k.trim().toLowerCase()).filter(Boolean).length > 0 ||
    skillIds.length > 0
  );
}

function keywordMatchesCategory(keyword: string, category: string): boolean {
  const categoryLabel = category.toLowerCase();
  const normalizedKeyword = normalizeMatchToken(keyword);
  if (!normalizedKeyword) {
    return false;
  }
  return (
    categoryLabel.includes(keyword) ||
    normalizeMatchToken(categoryLabel).includes(normalizedKeyword)
  );
}

function skillMatchesKeywordOrId(
  skill: EmployeeMatchCandidate['skills'][number],
  keywords: string[],
  skillIds: number[],
): boolean {
  if (skillIds.includes(skill.skillId)) {
    return true;
  }

  return keywords.some(
    (keyword) =>
      tokensMatch(skill.skillName, keyword) ||
      (skill.skillCategory
        ? keywordMatchesCategory(keyword, skill.skillCategory)
        : false),
  );
}

/** Whether a candidate satisfies the skill portion of a parsed requirement. */
export function candidateHasRequiredSkillMatch(
  candidate: EmployeeMatchCandidate,
  parsed: ParsedRequirement | undefined,
  keywords: string[],
  skillIds: number[],
): boolean {
  const normalizedKeywords = keywords
    .map((k) => k.trim().toLowerCase())
    .filter(Boolean);
  const categories = parsed?.skillCategories ?? [];

  if (!hasSkillFilter(parsed, normalizedKeywords, skillIds)) {
    return true;
  }

  if (hasExplicitSkillTokens(normalizedKeywords, skillIds)) {
    return candidate.skills.some((skill) =>
      skillMatchesKeywordOrId(skill, normalizedKeywords, skillIds),
    );
  }

  return candidate.skills.some(
    (skill) =>
      skill.skillCategory &&
      categories.includes(skill.skillCategory as SkillCategory),
  );
}

export function formatRequestedSkills(
  parsed: ParsedRequirement,
  keywords: string[],
): string {
  const parts = [
    ...keywords.map((k) => k.trim()).filter(Boolean),
    ...parsed.skillCategories.map((c) => c.toLowerCase()),
  ];
  const unique = [...new Set(parts)];
  if (!unique.length) {
    return 'the requested skills';
  }
  return unique.join(', ');
}
