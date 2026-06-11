import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Allocation } from '../database/entities/allocation.entity';
import { Resource } from '../database/entities/resource.entity';
import { Milestone } from '../database/entities/milestone.entity';
import { Project } from '../database/entities/project.entity';
import { TimesheetEntry } from '../database/entities/timesheet-entry.entity';
import { TimesheetWeek } from '../database/entities/timesheet-week.entity';
import { DatabaseModule } from '../database/database.module';
import { SchedulerBootstrap } from './scheduler.bootstrap';
import { SchedulerController } from './scheduler.controller';
import { SchedulerService } from './scheduler.service';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    DatabaseModule,
    TypeOrmModule.forFeature([
      Resource,
      Allocation,
      TimesheetWeek,
      TimesheetEntry,
      Project,
      Milestone,
    ]),
  ],
  controllers: [SchedulerController],
  providers: [SchedulerService, SchedulerBootstrap],
  exports: [SchedulerService],
})
export class SchedulerModule {}
