import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Allocation } from '../database/entities/allocation.entity';
import { Resource } from '../database/entities/resource.entity';
import { Milestone } from '../database/entities/milestone.entity';
import { Project } from '../database/entities/project.entity';
import { TimesheetEntry } from '../database/entities/timesheet-entry.entity';
import { TimesheetWeek } from '../database/entities/timesheet-week.entity';
import { User } from '../database/entities/user.entity';
import { RefreshToken } from '../database/entities/refresh-token.entity';
import { DatabaseModule } from '../database/database.module';
import { MatchingModule } from '../matching/matching.module';
import { LlmModule } from '../llm/llm.module';
import { SchedulerBootstrap } from './scheduler.bootstrap';
import { SchedulerController } from './scheduler.controller';
import { SchedulerService } from './scheduler.service';
import { ResourceSyncService } from './resource-sync.service';
import { TimesheetAuditService } from './timesheet-audit.service';
import { ProjectHealthService } from './project-health.service';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    DatabaseModule,
    MatchingModule,
    LlmModule,
    TypeOrmModule.forFeature([
      Resource,
      Allocation,
      TimesheetWeek,
      TimesheetEntry,
      Project,
      Milestone,
      User,
      RefreshToken,
    ]),
  ],
  controllers: [SchedulerController],
  providers: [
    SchedulerService,
    SchedulerBootstrap,
    ResourceSyncService,
    TimesheetAuditService,
    ProjectHealthService,
  ],
  exports: [SchedulerService],
})
export class SchedulerModule {}
