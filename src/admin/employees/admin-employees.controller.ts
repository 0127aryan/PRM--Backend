import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole } from '../../database/enums';
import { AdminEmployeesService } from './admin-employees.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { SetEmployeeSkillsDto } from './dto/set-employee-skills.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';

@ApiTags('admin/employees')
@Roles(UserRole.ADMIN)
@Controller('admin/employees')
export class AdminEmployeesController {
  constructor(private readonly service: AdminEmployeesService) {}

  @Get()
  list() {
    return this.service.list();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateEmployeeDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateEmployeeDto,
  ) {
    return this.service.update(id, dto);
  }

  @Put(':id/skills')
  setSkills(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SetEmployeeSkillsDto,
  ) {
    return this.service.setSkills(id, dto);
  }

  @Post(':id/deactivate')
  @HttpCode(HttpStatus.OK)
  deactivate(@Param('id', ParseIntPipe) id: number) {
    return this.service.deactivate(id);
  }
}
