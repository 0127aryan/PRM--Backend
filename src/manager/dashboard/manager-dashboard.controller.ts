import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole } from '../../database/enums';
import type { JwtAccessPayload } from '../../auth/interfaces/jwt-payload.interface';
import { ManagerDashboardService } from './manager-dashboard.service';

@ApiTags('manager/dashboard')
@Roles(UserRole.MANAGER)
@Controller('manager/dashboard')
export class ManagerDashboardController {
  constructor(private readonly service: ManagerDashboardService) {}

  @Get()
  @ApiOperation({ summary: 'Manager dashboard: projects, direct reports, bench preview' })
  getDashboard(@CurrentUser() user: JwtAccessPayload) {
    return this.service.getDashboard(user);
  }

  @Get('employees/:id')
  getEmployee(
    @CurrentUser() user: JwtAccessPayload,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.service.getEmployeeDetail(user, id);
  }
}
