import { ResourceStatus, Proficiency, SkillCategory } from '../database/enums';

export interface SkillMatchInput {
  skillId: number;
  skillName: string;
  skillCategory?: SkillCategory;
  proficiency: Proficiency;
}

export interface EmployeeMatchCandidate {
  employeeId: number;
  employeeCode: string;
  fullName: string;
  status: ResourceStatus;
  department: string;
  skills: SkillMatchInput[];
  availableUtilizationPct: number;
}

export interface RankedEmployeeMatch {
  employeeId: number;
  employeeCode: string;
  fullName: string;
  status: ResourceStatus;
  department: string;
  score: number;
  reasons: string[];
  matchedSkills: {
    skillId: number;
    skillName: string;
    proficiency: Proficiency;
  }[];
}
