import { Proficiency, ResourceStatus, SkillCategory } from '../database/enums';
import { ParsedRequirement } from './parsed-requirement.types';

const STOP_WORDS = new Set([
  'i',
  'need',
  'want',
  'a',
  'an',
  'the',
  'with',
  'of',
  'and',
  'should',
  'be',
  'level',
  'skills',
  'skill',
  'developer',
  'engineer',
  'experience',
  'from',
  'available',
  'for',
  'in',
  'at',
  'to',
  'has',
  'have',
  'who',
  'whom',
  'that',
  'this',
  'is',
  'are',
  'was',
  'were',
  'months',
  'month',
  'weeks',
  'week',
  'hrs',
  'hours',
  'part',
  'time',
  'full',
  'needed',
  'allocation',
  'utilization',
  'capacity',
]);

const PROFICIENCY_RANK: Record<Proficiency, number> = {
  [Proficiency.BEGINNER]: 1,
  [Proficiency.INTERMEDIATE]: 2,
  [Proficiency.ADVANCED]: 3,
};

export function proficiencyMeetsMinimum(
  actual: Proficiency,
  minimum: Proficiency,
): boolean {
  return PROFICIENCY_RANK[actual] >= PROFICIENCY_RANK[minimum];
}

/** Rule-based natural language → structured search filters. */
export function parseRequirement(text: string): ParsedRequirement {
  const lower = text.toLowerCase().trim();
  let requiredStatus: ResourceStatus | undefined;
  let minProficiency: Proficiency | undefined;
  const skillCategories: SkillCategory[] = [];

  if (/\b(on\s+)?bench(?:ed)?\b/.test(lower)) {
    requiredStatus = ResourceStatus.BENCH;
  } else if (/\ballocated\b/.test(lower)) {
    requiredStatus = ResourceStatus.ALLOCATED;
  }

  if (/\bintermediate\b/.test(lower)) {
    minProficiency = Proficiency.INTERMEDIATE;
  } else if (/\badvanced\b/.test(lower)) {
    minProficiency = Proficiency.ADVANCED;
  } else if (/\bbeginner\b/.test(lower)) {
    minProficiency = Proficiency.BEGINNER;
  }

  if (/\bbackend\b/.test(lower)) skillCategories.push(SkillCategory.BACKEND);
  if (/\bfrontend\b/.test(lower)) skillCategories.push(SkillCategory.FRONTEND);
  if (/\bdevops\b/.test(lower)) skillCategories.push(SkillCategory.DEVOPS);
  if (/\bqa\b|\btesting\b/.test(lower)) skillCategories.push(SkillCategory.QA);

  const requiredUtilizationPct = parseRequiredUtilizationPct(lower);

  const cleaned = lower
    .replace(/\b\d{1,3}\s*%?\s*(?:allocation|utilization|capacity)\b/g, ' ')
    .replace(/\b\d{1,3}\s*percent\b/g, ' ')
    .replace(/\bwho\s+is\s+/g, ' ')
    .replace(/\bon\s+bench(?:ed)?\b/g, ' ')
    .replace(/\bbench(?:ed)?\b/g, ' ')
    .replace(/\bshould\s+be\b/g, ' ')
    .replace(/\bintermediate\s+level\b/g, ' ')
    .replace(/\b(beginner|intermediate|advanced)\b/g, ' ')
    .replace(/\b(backend|frontend|devops|qa)\s+developer\b/g, ' ')
    .replace(/\bdeveloper\b/g, ' ')
    .replace(/\bengineer\b/g, ' ');

  const keywords = [
    ...new Set(
      cleaned
        .split(/[\s,;/]+/)
        .map((s) => s.replace(/[^a-z0-9+#.]/g, ''))
        .filter((s) => s.length >= 2 && !STOP_WORDS.has(s)),
    ),
  ];

  return {
    keywords,
    skillIds: [],
    requiredStatus,
    minProficiency,
    skillCategories,
    requiredUtilizationPct,
  };
}

function parseRequiredUtilizationPct(lower: string): number | undefined {
  const patterns = [
    /(\d{1,3})\s*%\s*(?:allocation|utilization|capacity)\b/,
    /(\d{1,3})\s*percent\s*(?:allocation|utilization|capacity)?\b/,
    /(?:need(?:ed)?|require(?:d)?|with)\s+(\d{1,3})\s*%/,
    /(?:need(?:ed)?|require(?:d)?)\s+(?:an?\s+)?(?:allocation|utilization|capacity)\s+of\s+(\d{1,3})\s*%?/,
    /(\d{1,3})\s*%\s*(?:allocation|utilization|capacity)\s+(?:needed|required)\b/,
  ];

  for (const pattern of patterns) {
    const match = lower.match(pattern);
    if (!match) continue;
    const pct = Number(match[1]);
    if (pct >= 1 && pct <= 100) {
      return pct;
    }
  }

  return undefined;
}

export interface RequirementFilterCandidate {
  status: ResourceStatus;
  availableUtilizationPct?: number;
  skills: Array<{
    skillCategory?: SkillCategory;
    proficiency: Proficiency;
  }>;
}

/** Apply structured NL filters (status, proficiency, categories, availability) to a candidate. */
export function passesRequirementFilters(
  candidate: RequirementFilterCandidate,
  requirement?: ParsedRequirement,
): boolean {
  if (!requirement) return true;

  if (
    requirement.requiredStatus &&
    candidate.status !== requirement.requiredStatus
  ) {
    return false;
  }

  if (
    requirement.requiredUtilizationPct !== undefined &&
    (candidate.availableUtilizationPct ?? 100) <
      requirement.requiredUtilizationPct
  ) {
    return false;
  }

  if (!requirement.minProficiency && !requirement.skillCategories.length) {
    return true;
  }

  return candidate.skills.some((skill) => {
    const categoryOk =
      !requirement.skillCategories.length ||
      (skill.skillCategory &&
        requirement.skillCategories.includes(skill.skillCategory));
    const proficiencyOk =
      !requirement.minProficiency ||
      proficiencyMeetsMinimum(skill.proficiency, requirement.minProficiency);
    return categoryOk && proficiencyOk;
  });
}
