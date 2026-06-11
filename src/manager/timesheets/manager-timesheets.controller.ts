import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole } from '../../database/enums';
import type { JwtAccessPayload } from '../../auth/interfaces/jwt-payload.interface';
import { ManagerTimesheetsService } from './manager-timesheets.service';

@ApiTags('manager/timesheets')
@Roles(UserRole.MANAGER)
@Controller('manager/timesheets')
export class ManagerTimesheetsController {
  constructor(private readonly service: ManagerTimesheetsService) {}

  @Get()
  @ApiOperation({ summary: 'Direct reports timesheets for a week (read-only)' })
  @ApiQuery({ name: 'weekStart', required: true, example: '2026-03-03' })
  list(
    @CurrentUser() user: JwtAccessPayload,
    @Query('weekStart') weekStart: string,
  ) {
    return this.service.listForWeek(user, weekStart);
  }
}
