import { ActivityTag } from './activity-tag.entity';
import { Allocation } from './allocation.entity';
import { Milestone } from './milestone.entity';
import { Notification } from './notification.entity';
import { PasswordSetupToken } from './password-setup-token.entity';
import { Project } from './project.entity';
import { RefreshToken } from './refresh-token.entity';
import { ResourceSkill } from './resource-skill.entity';
import { Resource } from './resource.entity';
import { Skill } from './skill.entity';
import { SystemConfig } from './system-config.entity';
import { TimesheetEntryTag } from './timesheet-entry-tag.entity';
import { TimesheetEntry } from './timesheet-entry.entity';
import { TimesheetWeek } from './timesheet-week.entity';
import { User } from './user.entity';

export const entities = [
  User,
  Resource,
  Skill,
  ResourceSkill,
  Project,
  Milestone,
  Allocation,
  TimesheetWeek,
  TimesheetEntry,
  ActivityTag,
  TimesheetEntryTag,
  SystemConfig,
  RefreshToken,
  PasswordSetupToken,
  Notification,
];

export {
  ActivityTag,
  Allocation,
  Milestone,
  Notification,
  PasswordSetupToken,
  Project,
  RefreshToken,
  Resource,
  ResourceSkill,
  Skill,
  SystemConfig,
  TimesheetEntry,
  TimesheetEntryTag,
  TimesheetWeek,
  User,
};

