import { Proficiency, ResourceStatus, SkillCategory } from '../database/enums';

export interface ParsedRequirement {
  keywords: string[];
  skillIds: number[];
  requiredStatus?: ResourceStatus;
  minProficiency?: Proficiency;
  skillCategories: SkillCategory[];
  /** Minimum free utilization % the employee must have today (e.g. 60 means 60% unallocated). */
  requiredUtilizationPct?: number;
}
