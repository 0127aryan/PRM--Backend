import { Controller, Get, Param, ParseIntPipe, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole } from '../../database/enums';
import type { JwtAccessPayload } from '../../auth/interfaces/jwt-payload.interface';
import { ManagerEmployeesService } from './manager-employees.service';

@ApiTags('manager/employees')
@Roles(UserRole.MANAGER)
@Controller('manager/employees')
export class ManagerEmployeesController {
  constructor(private readonly service: ManagerEmployeesService) {}

  @Get()
  list(@CurrentUser() user: JwtAccessPayload) {
    return this.service.listDirectReports(user);
  }

  @Get(':id')
  findOne(
    @CurrentUser() user: JwtAccessPayload,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.service.findDirectReport(user, id);
  }

  @Post(':id/unfreeze')
  unfreeze(
    @CurrentUser() user: JwtAccessPayload,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.service.unfreeze(user, id);
  }
}
