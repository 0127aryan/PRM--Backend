import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole } from '../../database/enums';
import type { JwtAccessPayload } from '../../auth/interfaces/jwt-payload.interface';
import { ManagerProjectsService } from './manager-projects.service';
import { UpdateProjectStatusDto } from './dto/update-project-status.dto';

@ApiTags('manager/projects')
@Roles(UserRole.MANAGER)
@Controller('manager/projects')
export class ManagerProjectsController {
  constructor(private readonly service: ManagerProjectsService) {}

  @Get()
  list(@CurrentUser() user: JwtAccessPayload) {
    return this.service.list(user);
  }

  @Get(':id')
  findOne(
    @CurrentUser() user: JwtAccessPayload,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.service.findOne(user, id);
  }

  @Get(':id/risk-flags')
  @ApiOperation({ summary: 'Rule-based risk flags for a managed project' })
  riskFlags(
    @CurrentUser() user: JwtAccessPayload,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.service.riskFlags(user, id);
  }

  @Patch(':id/status')
  @ApiOperation({
    summary: 'Update project status (manager-owned projects only)',
  })
  updateStatus(
    @CurrentUser() user: JwtAccessPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateProjectStatusDto,
  ) {
    return this.service.updateStatus(user, id, dto);
  }
}
