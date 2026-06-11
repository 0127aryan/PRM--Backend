import { Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../database/enums';
import { SchedulerService } from './scheduler.service';

@ApiTags('admin/scheduler')
@Roles(UserRole.ADMIN)
@Controller('admin/scheduler')
export class SchedulerController {
  constructor(private readonly scheduler: SchedulerService) {}

  @Post('run')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Run maintenance jobs now (employee status, missed timesheets, project health)',
  })
  run() {
    return this.scheduler.run();
  }
}
