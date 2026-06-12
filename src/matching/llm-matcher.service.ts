import { Injectable, Logger } from '@nestjs/common';
import { LlmClientService } from '../llm/llm-client.service';
import {
  EmployeeMatchCandidate,
  RankedEmployeeMatch,
} from './matching.types';
import { ParsedRequirement } from './parsed-requirement.types';
import {
  candidateHasRequiredSkillMatch,
  hasSkillFilter,
} from './matching-skill-filter.util';
import { passesRequirementFilters } from './parse-requirement.util';

function skillKeywordsPresent(requirement?: ParsedRequirement): boolean {
  return hasSkillFilter(requirement, requirement?.keywords ?? [], requirement?.skillIds ?? []);
}

interface LlmMatchRow {
  employeeId: number;
  score: number;
  reasons: string[];
  matchedSkills?: Array<{ skillId: number; skillName: string }>;
}

interface LlmMatchResponse {
  matches: LlmMatchRow[];
}

@Injectable()
export class LlmMatcherService {
  private readonly logger = new Logger(LlmMatcherService.name);

  constructor(private readonly llm: LlmClientService) {}

  async rankMatches(
    candidates: EmployeeMatchCandidate[],
    query: string,
    requirement?: ParsedRequirement,
  ): Promise<RankedEmployeeMatch[]> {
    const trimmed = query.trim();
    if (!trimmed) {
      throw new Error('Natural language query is required for LLM matching');
    }
    if (candidates.length === 0) {
      return [];
    }

    const prompt = this.buildPrompt(candidates, trimmed, requirement);
    const raw = await this.llm.complete(prompt, { jsonMode: true, temperature: 0.1 });
    const parsed = this.parseResponse(raw);
    return this.mergeWithCandidates(candidates, parsed.matches, requirement);
  }

  private buildPrompt(
    candidates: EmployeeMatchCandidate[],
    query: string,
    requirement?: ParsedRequirement,
  ): string {
    const employeePayload = candidates.map((c) => ({
      employeeId: c.employeeId,
      employeeCode: c.employeeCode,
      fullName: c.fullName,
      status: c.status,
      department: c.department,
      availableUtilizationPct: c.availableUtilizationPct,
      skills: c.skills.map((s) => ({
        skillId: s.skillId,
        skillName: s.skillName,
        skillCategory: s.skillCategory,
        proficiency: s.proficiency,
      })),
    }));

    const hardFilters = this.describeHardFilters(requirement);

    return [
      'You are a resource matching assistant for an IT services company.',
      'Given a manager natural-language requirement and employee skill profiles, rank the best matches.',
      'Only include employees from the provided list. Score 0-100 (higher is better).',
      'Provide 1-3 concise reasons per match referencing specific skills or availability.',
      'Treat status, proficiency, and skill-category constraints as mandatory filters — never return employees who violate them.',
      'When a specific technology or skill is named (e.g. ColdFusion, Java), only return employees who list that exact skill — never substitute a different technology.',
      ...(hardFilters ? ['', `Mandatory filters: ${hardFilters}`] : []),
      '',
      `Requirement: ${query}`,
      '',
      `Employees JSON: ${JSON.stringify(employeePayload)}`,
      '',
      'Respond with ONLY valid JSON in this shape:',
      '{"matches":[{"employeeId":number,"score":number,"reasons":["string"],"matchedSkills":[{"skillId":number,"skillName":"string"}]}]}',
      'Sort matches by score descending.',
      skillKeywordsPresent(requirement)
        ? 'Include EVERY employee who has a matching skill from the requirement keywords — do not omit skill-qualified employees.'
        : 'Omit employees who are poor fits.',
    ].join('\n');
  }

  private parseResponse(raw: string): LlmMatchResponse {
    const jsonText = this.extractJson(raw);
    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonText);
    } catch {
      this.logger.warn(`LLM returned non-JSON: ${raw.slice(0, 200)}`);
      throw new Error('LLM response was not valid JSON');
    }

    const matches = (parsed as LlmMatchResponse).matches;
    if (!Array.isArray(matches)) {
      throw new Error('LLM response missing matches array');
    }

    return {
      matches: matches
        .filter((m) => typeof m?.employeeId === 'number')
        .map((m) => ({
          employeeId: m.employeeId,
          score: typeof m.score === 'number' ? m.score : 0,
          reasons: Array.isArray(m.reasons)
            ? m.reasons.filter((r): r is string => typeof r === 'string')
            : [],
          matchedSkills: Array.isArray(m.matchedSkills) ? m.matchedSkills : [],
        })),
    };
  }

  private extractJson(raw: string): string {
    const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenced?.[1]) {
      return fenced[1].trim();
    }
    const start = raw.indexOf('{');
    const end = raw.lastIndexOf('}');
    if (start >= 0 && end > start) {
      return raw.slice(start, end + 1);
    }
    return raw.trim();
  }

  private describeHardFilters(requirement?: ParsedRequirement): string | null {
    if (!requirement) return null;

    const parts: string[] = [];
    if (requirement.requiredStatus) {
      parts.push(`status must be ${requirement.requiredStatus}`);
    }
    if (requirement.minProficiency) {
      parts.push(`minimum proficiency ${requirement.minProficiency}`);
    }
    if (requirement.keywords.length) {
      parts.push(
        `must have skill/technology keywords: ${requirement.keywords.join(', ')}`,
      );
    }
    if (requirement.skillCategories.length) {
      parts.push(`skill categories ${requirement.skillCategories.join(', ')}`);
    }
    if (requirement.requiredUtilizationPct !== undefined) {
      parts.push(
        `at least ${requirement.requiredUtilizationPct}% utilization available today`,
      );
    }
    return parts.length ? parts.join('; ') : null;
  }

  private mergeWithCandidates(
    candidates: EmployeeMatchCandidate[],
    rows: LlmMatchRow[],
    requirement?: ParsedRequirement,
  ): RankedEmployeeMatch[] {
    const byId = new Map(candidates.map((c) => [c.employeeId, c]));

    return rows
      .map((row) => {
        const candidate = byId.get(row.employeeId);
        if (
          !candidate ||
          !passesRequirementFilters(candidate, requirement) ||
          !candidateHasRequiredSkillMatch(
            candidate,
            requirement,
            requirement?.keywords ?? [],
            requirement?.skillIds ?? [],
          )
        ) {
          return null;
        }

        const skillById = new Map(candidate.skills.map((s) => [s.skillId, s]));
        const matchedSkills = (row.matchedSkills ?? [])
          .map((ms) => {
            const skill = skillById.get(ms.skillId);
            if (!skill) return null;
            return {
              skillId: skill.skillId,
              skillName: skill.skillName,
              proficiency: skill.proficiency,
            };
          })
          .filter((s): s is NonNullable<typeof s> => s !== null);

        return {
          employeeId: candidate.employeeId,
          employeeCode: candidate.employeeCode,
          fullName: candidate.fullName,
          status: candidate.status,
          department: candidate.department,
          score: row.score,
          reasons:
            row.reasons.length > 0
              ? row.reasons
              : ['Matched by AI based on your requirement'],
          matchedSkills,
        };
      })
      .filter((r): r is RankedEmployeeMatch => r !== null)
      .sort((a, b) => b.score - a.score || a.fullName.localeCompare(b.fullName));
  }
}
