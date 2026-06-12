import { Injectable, Logger } from '@nestjs/common';
import { LlmClientService } from '../llm/llm-client.service';
import { parseRequirement } from './parse-requirement.util';
import { ParsedRequirement } from './parsed-requirement.types';
import { Proficiency, ResourceStatus, SkillCategory } from '../database/enums';

interface LlmParsedShape {
  keywords?: string[];
  requiredStatus?: string | null;
  minProficiency?: string | null;
  skillCategories?: string[];
  requiredUtilizationPct?: number | null;
}

@Injectable()
export class LlmRequirementParserService {
  private readonly logger = new Logger(LlmRequirementParserService.name);

  constructor(private readonly llm: LlmClientService) {}

  async parse(query: string): Promise<ParsedRequirement> {
    const fallback = parseRequirement(query);
    try {
      const prompt = [
        'Convert this manager resource requirement into JSON database search filters.',
        'These filters are applied BEFORE ranking employees — only matching rows are fetched.',
        'Use only values from the allowed enums. Set a field to null when not mentioned.',
        '',
        `Requirement: ${query}`,
        '',
        'Status mapping (requiredStatus):',
        '- "bench", "benched", "on bench" -> BENCH',
        '- "allocated", "on project" -> ALLOCATED',
        '',
        'Allowed requiredStatus: BENCH, ALLOCATED, or null',
        'Allowed minProficiency: BEGINNER, INTERMEDIATE, ADVANCED, or null',
        'Allowed skillCategories: BACKEND, FRONTEND, DEVOPS, QA, OTHER',
        '',
        'keywords: skill names or technologies mentioned (lowercase), excluding status words and generic role words (developer, engineer).',
        'When a specific technology is named (e.g. coldfusion, java, react), put it in keywords only — do not add skillCategories inferred from generic words like developer.',
        'skillCategories: only when a domain is explicitly stated (backend, frontend, devops, qa) and no specific technology keyword covers it.',
        'requiredUtilizationPct: minimum free allocation % needed today (e.g. "60% allocation" -> 60). null if not mentioned.',
        '',
        'Respond ONLY with JSON:',
        '{"keywords":["string"],"requiredStatus":"BENCH"|null,"minProficiency":"INTERMEDIATE"|null,"skillCategories":["BACKEND"],"requiredUtilizationPct":60|null}',
      ].join('\n');

      const raw = await this.llm.complete(prompt, { jsonMode: true, temperature: 0 });
      const parsed = this.normalizeLlmJson(raw, fallback);
      return parsed;
    } catch (error) {
      this.logger.warn(
        `LLM requirement parse failed, using rule-based parser: ${
          error instanceof Error ? error.message : 'unknown error'
        }`,
      );
      return fallback;
    }
  }

  private normalizeLlmJson(raw: string, fallback: ParsedRequirement): ParsedRequirement {
    const jsonText = raw.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1] ?? raw;
    const start = jsonText.indexOf('{');
    const end = jsonText.lastIndexOf('}');
    if (start < 0 || end <= start) return fallback;

    let data: LlmParsedShape;
    try {
      data = JSON.parse(jsonText.slice(start, end + 1)) as LlmParsedShape;
    } catch {
      return fallback;
    }

    const requiredStatus = this.parseStatus(data.requiredStatus) ?? fallback.requiredStatus;
    const minProficiency =
      this.parseProficiency(data.minProficiency) ?? fallback.minProficiency;
    const skillCategories = [
      ...new Set([
        ...fallback.skillCategories,
        ...(data.skillCategories ?? [])
          .map((c) => this.parseCategory(c))
          .filter((c): c is SkillCategory => c !== null),
      ]),
    ];
    const keywords = [
      ...new Set([
        ...fallback.keywords,
        ...(data.keywords ?? []).map((k) => k.toLowerCase().trim()).filter(Boolean),
      ]),
    ];

    const requiredUtilizationPct =
      this.parseUtilizationPct(data.requiredUtilizationPct) ??
      fallback.requiredUtilizationPct;

    return {
      keywords,
      skillIds: [],
      requiredStatus,
      minProficiency,
      skillCategories,
      requiredUtilizationPct,
    };
  }

  private parseUtilizationPct(value?: number | null): number | undefined {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      return undefined;
    }
    const pct = Math.round(value);
    if (pct < 1 || pct > 100) {
      return undefined;
    }
    return pct;
  }

  private parseStatus(value?: string | null): ResourceStatus | undefined {
    const v = value?.trim().toUpperCase();
    if (v === ResourceStatus.BENCH) return ResourceStatus.BENCH;
    if (v === ResourceStatus.ALLOCATED) return ResourceStatus.ALLOCATED;
    return undefined;
  }

  private parseProficiency(value?: string | null): Proficiency | undefined {
    const v = value?.trim().toUpperCase();
    if (v === Proficiency.BEGINNER) return Proficiency.BEGINNER;
    if (v === Proficiency.INTERMEDIATE) return Proficiency.INTERMEDIATE;
    if (v === Proficiency.ADVANCED) return Proficiency.ADVANCED;
    return undefined;
  }

  private parseCategory(value?: string): SkillCategory | null {
    const v = value?.trim().toUpperCase();
    if (v && Object.values(SkillCategory).includes(v as SkillCategory)) {
      return v as SkillCategory;
    }
    return null;
  }
}
