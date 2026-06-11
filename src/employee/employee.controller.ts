import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../database/enums';
import type { JwtAccessPayload } from '../auth/interfaces/jwt-payload.interface';
import { EmployeeActivityTagsService } from './employee-activity-tags.service';
import { EmployeeAllocationsService } from './employee-allocations.service';
import { EmployeeTimesheetsService } from './employee-timesheets.service';
import { SubmitTimesheetDto } from './dto/submit-timesheet.dto';

@ApiTags('employee')
@Roles(UserRole.EMPLOYEE)
@Controller('employee')
export class EmployeeController {
  constructor(
    private readonly activityTags: EmployeeActivityTagsService,
    private readonly allocations: EmployeeAllocationsService,
    private readonly timesheets: EmployeeTimesheetsService,
  ) {}

  @Get('activity-tags')
  @ApiOperation({ summary: 'List active predefined activity tags' })
  listActivityTags() {
    return this.activityTags.listActive();
  }

  @Get('allocations')
  @ApiOperation({ summary: 'My active project allocations' })
  listAllocations(@CurrentUser() user: JwtAccessPayload) {
    return this.allocations.listMine(user);
  }

  @Get('timesheets')
  @ApiOperation({ summary: 'My timesheets (optional weekStart filter)' })
  @ApiQuery({ name: 'weekStart', required: false, example: '2026-03-03' })
  listTimesheets(
    @CurrentUser() user: JwtAccessPayload,
    @Query('weekStart') weekStart?: string,
  ) {
    return this.timesheets.list(user, weekStart);
  }

  @Get('timesheets/reminders')
  @ApiOperation({ summary: 'Missed or not submitted weeks (last 8 past weeks)' })
  missedReminders(@CurrentUser() user: JwtAccessPayload) {
    return this.timesheets.missedReminders(user);
  }

  @Post('timesheets')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Submit weekly timesheet (Monday weekStart, whole hours)' })
  submitTimesheet(
    @CurrentUser() user: JwtAccessPayload,
    @Body() dto: SubmitTimesheetDto,
  ) {
    return this.timesheets.submit(user, dto);
  }
}
