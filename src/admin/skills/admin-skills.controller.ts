import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole } from '../../database/enums';
import { AdminSkillsService } from './admin-skills.service';
import { CreateSkillDto } from './dto/create-skill.dto';

@ApiTags('admin/skills')
@Roles(UserRole.ADMIN)
@Controller('admin/skills')
export class AdminSkillsController {
  constructor(private readonly service: AdminSkillsService) {}

  @Get()
  list() {
    return this.service.list();
  }

  @Post()
  create(@Body() dto: CreateSkillDto) {
    return this.service.create(dto);
  }
}
