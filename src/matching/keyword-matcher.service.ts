import { Injectable } from '@nestjs/common';
import { ResourceStatus, Proficiency } from '../database/enums';
import { normalizeMatchToken, tokensMatch } from './matching-normalize.util';
import {
  EmployeeMatchCandidate,
  RankedEmployeeMatch,
  SkillMatchInput,
} from './matching.types';

@Injectable()
export class KeywordMatcherService {
  rankMatches(
    candidates: EmployeeMatchCandidate[],
    keywords: string[],
    skillIds: number[],
  ): RankedEmployeeMatch[] {
    const normalizedKeywords = keywords
      .map((k) => k.trim().toLowerCase())
      .filter(Boolean);
    const hasFilter = normalizedKeywords.length > 0 || skillIds.length > 0;

    const ranked = candidates
      .map((candidate) => this.scoreCandidate(candidate, normalizedKeywords, skillIds))
      .filter((row) => !hasFilter || row.matchedSkills.length > 0)
      .sort((a, b) => b.score - a.score || a.fullName.localeCompare(b.fullName));

    return ranked;
  }

  private scoreCandidate(
    candidate: EmployeeMatchCandidate,
    keywords: string[],
    skillIds: number[],
  ): RankedEmployeeMatch {
    const reasons: string[] = [];
    let score = 0;
    const matchedSkills: SkillMatchInput[] = [];

    for (const skill of candidate.skills) {
      let skillMatched = false;

      if (skillIds.includes(skill.skillId)) {
        score += 10;
        skillMatched = true;
        reasons.push(`Has required skill: ${skill.skillName}`);
      }

      for (const keyword of keywords) {
        if (tokensMatch(skill.skillName, keyword)) {
          score += 5;
          skillMatched = true;
          reasons.push(`Skill name matches keyword "${keyword}": ${skill.skillName}`);
        } else if (
          skill.skillCategory &&
          this.keywordMatchesCategory(keyword, skill.skillCategory)
        ) {
          score += 5;
          skillMatched = true;
          reasons.push(
            `Skill category matches keyword "${keyword}": ${skill.skillName} (${skill.skillCategory})`,
          );
        }
      }

      if (skillMatched) {
        const profBonus = this.proficiencyBonus(skill.proficiency);
        if (profBonus > 0) {
          score += profBonus;
          reasons.push(
            `${skill.skillName} proficiency ${skill.proficiency} (+${profBonus} score)`,
          );
        }
        matchedSkills.push({
          skillId: skill.skillId,
          skillName: skill.skillName,
          proficiency: skill.proficiency,
        });
      }
    }

    if (candidate.status === ResourceStatus.BENCH) {
      score += 2;
      reasons.push('Currently on bench (available for allocation)');
    }

    if (!keywords.length && !skillIds.length) {
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
      reasons: uniqueReasons,
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
