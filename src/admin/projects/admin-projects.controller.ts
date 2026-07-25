import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole } from '../../database/enums';
import { AdminProjectsService } from './admin-projects.service';
import { CreateMilestoneDto } from './dto/create-milestone.dto';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateMilestoneDto } from './dto/update-milestone.dto';
import { UpdateProjectDto } from './dto/update-project.dto';

@ApiTags('admin/projects')
@Roles(UserRole.ADMIN)
@Controller('admin/projects')
export class AdminProjectsController {
  constructor(private readonly service: AdminProjectsService) {}

  @Get()
  list() {
    return this.service.list();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateProjectDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateProjectDto) {
    return this.service.update(id, dto);
  }

  @Post(':id/milestones')
  @ApiOperation({ summary: 'Add milestone to project' })
  addMilestone(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateMilestoneDto,
  ) {
    return this.service.addMilestone(id, dto);
  }

  @Patch(':projectId/milestones/:milestoneId')
  updateMilestone(
    @Param('projectId', ParseIntPipe) projectId: number,
    @Param('milestoneId', ParseIntPipe) milestoneId: number,
    @Body() dto: UpdateMilestoneDto,
  ) {
    return this.service.updateMilestone(projectId, milestoneId, dto);
  }
}
