import { Injectable } from '@nestjs/common';
import { ResourceStatus, Proficiency } from '../database/enums';
import { normalizeMatchToken, tokensMatch } from './matching-normalize.util';
import {
  EmployeeMatchCandidate,
  RankedEmployeeMatch,
  SkillMatchInput,
} from './matching.types';
import {
  candidateHasRequiredSkillMatch,
  hasExplicitSkillTokens,
  hasSkillFilter,
} from './matching-skill-filter.util';
import { ParsedRequirement } from './parsed-requirement.types';
import {
  passesRequirementFilters,
  proficiencyMeetsMinimum,
} from './parse-requirement.util';

@Injectable()
export class KeywordMatcherService {
  rankMatches(
    candidates: EmployeeMatchCandidate[],
    keywords: string[],
    skillIds: number[],
    requirement?: ParsedRequirement,
  ): RankedEmployeeMatch[] {
    const normalizedKeywords = keywords
      .map((k) => k.trim().toLowerCase())
      .filter(Boolean);
    const categories = requirement?.skillCategories ?? [];
    const skillFilterActive = hasSkillFilter(
      requirement,
      normalizedKeywords,
      skillIds,
    );
    const explicitSkillTokens = hasExplicitSkillTokens(
      normalizedKeywords,
      skillIds,
    );

    const ranked = candidates
      .filter((candidate) => passesRequirementFilters(candidate, requirement))
      .filter(
        (candidate) =>
          !skillFilterActive ||
          candidateHasRequiredSkillMatch(
            candidate,
            requirement,
            normalizedKeywords,
            skillIds,
          ),
      )
      .map((candidate) =>
        this.scoreCandidate(
          candidate,
          normalizedKeywords,
          skillIds,
          requirement,
          explicitSkillTokens,
        ),
      )
      .filter((row) => !skillFilterActive || row.matchedSkills.length > 0)
      .sort((a, b) => b.score - a.score || a.fullName.localeCompare(b.fullName));

    return ranked;
  }

  private scoreCandidate(
    candidate: EmployeeMatchCandidate,
    keywords: string[],
    skillIds: number[],
    requirement?: ParsedRequirement,
    explicitSkillTokens = false,
  ): RankedEmployeeMatch {
    const reasons: string[] = [];
    let score = 0;
    const matchedSkills: SkillMatchInput[] = [];
    const categories = requirement?.skillCategories ?? [];

    if (
      requirement?.requiredStatus &&
      candidate.status === requirement.requiredStatus
    ) {
      score += 8;
      reasons.push(
        requirement.requiredStatus === ResourceStatus.BENCH
          ? 'Currently on bench (required)'
          : 'Currently allocated (required)',
      );
    }

    if (
      requirement?.requiredUtilizationPct !== undefined &&
      candidate.availableUtilizationPct >= requirement.requiredUtilizationPct
    ) {
      score += 10;
      reasons.push(
        `${candidate.availableUtilizationPct}% available (needs ${requirement.requiredUtilizationPct}%)`,
      );
    }

    for (const skill of candidate.skills) {
      let skillMatched = false;

      if (skillIds.includes(skill.skillId)) {
        score += 10;
        skillMatched = true;
        reasons.push(`Has required skill: ${skill.skillName}`);
      }

      const categoryMatch =
        categories.length > 0 &&
        skill.skillCategory &&
        categories.includes(skill.skillCategory);

      if (categoryMatch && !explicitSkillTokens) {
        score += 6;
        skillMatched = true;
        reasons.push(
          `Has ${skill.skillCategory} skill: ${skill.skillName} (${skill.proficiency})`,
        );
      }

      for (const keyword of keywords) {
        if (tokensMatch(skill.skillName, keyword)) {
          score += 5;
          skillMatched = true;
          reasons.push(`Skill name matches "${keyword}": ${skill.skillName}`);
        } else if (
          skill.skillCategory &&
          this.keywordMatchesCategory(keyword, skill.skillCategory)
        ) {
          score += 5;
          skillMatched = true;
          reasons.push(
            `Skill category matches "${keyword}": ${skill.skillName} (${skill.skillCategory})`,
          );
        }
      }

      if (
        requirement?.minProficiency &&
        proficiencyMeetsMinimum(skill.proficiency, requirement.minProficiency) &&
        (categoryMatch || categories.length === 0)
      ) {
        score += 4;
        if (!skillMatched) {
          skillMatched = true;
          reasons.push(
            `Meets minimum proficiency (${requirement.minProficiency}) for ${skill.skillName}`,
          );
        }
      }

      if (skillMatched) {
        const profBonus = this.proficiencyBonus(skill.proficiency);
        if (profBonus > 0) {
          score += profBonus;
        }
        matchedSkills.push({
          skillId: skill.skillId,
          skillName: skill.skillName,
          proficiency: skill.proficiency,
        });
      }
    }

    if (
      !keywords.length &&
      !skillIds.length &&
      !categories.length &&
      !requirement?.requiredStatus
    ) {
      reasons.push('Listed as your direct report (no search filter applied)');
    }

    const uniqueReasons = [...new Set(reasons)];

    return {
      employeeId: candidate.employeeId,
      employeeCode: candidate.employeeCode,
      fullName: candidate.fullName,
      status: candidate.status,
      department: candidate.department,
      score,
      reasons: uniqueReasons.length ? uniqueReasons : ['Matches parsed requirement'],
      matchedSkills,
    };
  }

  private keywordMatchesCategory(keyword: string, category: string): boolean {
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

  private proficiencyBonus(proficiency: Proficiency): number {
    switch (proficiency) {
      case Proficiency.ADVANCED:
        return 3;
      case Proficiency.INTERMEDIATE:
        return 2;
      case Proficiency.BEGINNER:
        return 1;
      default:
        return 0;
    }
  }
}
