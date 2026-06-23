export enum UserRole {
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  EMPLOYEE = 'EMPLOYEE',
}

export enum AccountStatus {
  PENDING_PASSWORD = 'PENDING_PASSWORD',
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  FROZEN = 'FROZEN',
}

export enum ResourceStatus {
  BENCH = 'BENCH',
  ALLOCATED = 'ALLOCATED',
}

/** @deprecated Use ResourceStatus */
export const EmployeeStatus = ResourceStatus;

export enum SkillCategory {
  BACKEND = 'BACKEND',
  FRONTEND = 'FRONTEND',
  DEVOPS = 'DEVOPS',
  QA = 'QA',
  OTHER = 'OTHER',
}

export enum Proficiency {
  BEGINNER = 'BEGINNER',
  INTERMEDIATE = 'INTERMEDIATE',
  ADVANCED = 'ADVANCED',
}

export enum ProjectStatus {
  PLANNED = 'PLANNED',
  ACTIVE = 'ACTIVE',
  ON_HOLD = 'ON_HOLD',
}

export enum ProjectHealth {
  ON_TRACK = 'ON_TRACK',
  ATTENTION = 'ATTENTION',
  AT_RISK = 'AT_RISK',
}

export enum MilestoneStatus {
  NOT_STARTED = 'NOT_STARTED',
  IN_PROGRESS = 'IN_PROGRESS',
  DONE = 'DONE',
}

export enum TimesheetWeekStatus {
  SUBMITTED = 'SUBMITTED',
  MISSED = 'MISSED',
}
