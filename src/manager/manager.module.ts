import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Allocation } from '../database/entities/allocation.entity';
import { Resource } from '../database/entities/resource.entity';
import { ResourceSkill } from '../database/entities/resource-skill.entity';
import { User } from '../database/entities/user.entity';
import { Milestone } from '../database/entities/milestone.entity';
import { Project } from '../database/entities/project.entity';
import { Skill } from '../database/entities/skill.entity';
import { TimesheetEntry } from '../database/entities/timesheet-entry.entity';
import { TimesheetEntryTag } from '../database/entities/timesheet-entry-tag.entity';
import { TimesheetWeek } from '../database/entities/timesheet-week.entity';
import { DatabaseModule } from '../database/database.module';
import { LlmModule } from '../llm/llm.module';
import { MatchingModule } from '../matching/matching.module';
import { ManagerAssistantController } from './assistant/manager-assistant.controller';
import { ManagerAssistantService } from './assistant/manager-assistant.service';
import { ManagerAllocationsController } from './allocations/manager-allocations.controller';
import { ManagerAllocationsService } from './allocations/manager-allocations.service';
import { ManagerDashboardController } from './dashboard/manager-dashboard.controller';
import { ManagerDashboardService } from './dashboard/manager-dashboard.service';
import { ManagerEmployeesController } from './employees/manager-employees.controller';
import { ManagerEmployeesService } from './employees/manager-employees.service';
import { ManagerMatchingController } from './matching/manager-matching.controller';
import { ManagerMatchingService } from './matching/manager-matching.service';
import { ManagerContextService } from './manager-context.service';
import { ManagerProjectsController } from './projects/manager-projects.controller';
import { ManagerProjectsService } from './projects/manager-projects.service';
import { ManagerTimesheetsController } from './timesheets/manager-timesheets.controller';
import { ManagerTimesheetsService } from './timesheets/manager-timesheets.service';

@Module({
  imports: [
    DatabaseModule,
    LlmModule,
    MatchingModule,
    TypeOrmModule.forFeature([
      User,
      Resource,
      ResourceSkill,
      Project,
      Milestone,
      Allocation,
      Skill,
      TimesheetWeek,
      TimesheetEntry,
      TimesheetEntryTag,
    ]),
  ],
  controllers: [
    ManagerDashboardController,
    ManagerProjectsController,
    ManagerEmployeesController,
    ManagerAllocationsController,
    ManagerTimesheetsController,
    ManagerMatchingController,
    ManagerAssistantController,
  ],
  providers: [
    ManagerContextService,
    ManagerDashboardService,
    ManagerProjectsService,
    ManagerEmployeesService,
    ManagerAllocationsService,
    ManagerTimesheetsService,
    ManagerMatchingService,
    ManagerAssistantService,
  ],
})
export class ManagerModule {}
