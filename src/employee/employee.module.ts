import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActivityTag } from '../database/entities/activity-tag.entity';
import { Allocation } from '../database/entities/allocation.entity';
import { Resource } from '../database/entities/resource.entity';
import { TimesheetEntry } from '../database/entities/timesheet-entry.entity';
import { TimesheetEntryTag } from '../database/entities/timesheet-entry-tag.entity';
import { TimesheetWeek } from '../database/entities/timesheet-week.entity';
import { DatabaseModule } from '../database/database.module';
import { EmployeeActivityTagsService } from './employee-activity-tags.service';
import { EmployeeAllocationsService } from './employee-allocations.service';
import { EmployeeContextService } from './employee-context.service';
import { EmployeeController } from './employee.controller';
import { EmployeeTimesheetsService } from './employee-timesheets.service';

@Module({
  imports: [
    DatabaseModule,
    TypeOrmModule.forFeature([
      Resource,
      Allocation,
      ActivityTag,
      TimesheetWeek,
      TimesheetEntry,
      TimesheetEntryTag,
    ]),
  ],
  controllers: [EmployeeController],
  providers: [
    EmployeeContextService,
    EmployeeActivityTagsService,
    EmployeeAllocationsService,
    EmployeeTimesheetsService,
  ],
})
export class EmployeeModule {}
