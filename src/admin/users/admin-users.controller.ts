import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Body,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole } from '../../database/enums';
import { AdminUsersService } from './admin-users.service';
import { CreateUserDto } from './dto/create-user.dto';

@ApiTags('admin/users')
@Roles(UserRole.ADMIN)
@Controller('admin/users')
export class AdminUsersController {
  constructor(private readonly service: AdminUsersService) {}

  @Get()
  @ApiOperation({ summary: 'List all users' })
  list() {
    return this.service.list();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by id' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create user (email only) and return set-password link' })
  create(@Body() dto: CreateUserDto) {
    return this.service.create(dto);
  }

  @Post(':id/setup-link')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Generate a new set-password link' })
  setupLink(@Param('id', ParseIntPipe) id: number) {
    return this.service.issueSetupLink(id);
  }

  @Post(':id/reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Clear password and issue set-password link' })
  resetPassword(@Param('id', ParseIntPipe) id: number) {
    return this.service.resetPassword(id);
  }

  @Post(':id/deactivate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Deactivate user and revoke sessions' })
  deactivate(@Param('id', ParseIntPipe) id: number) {
    return this.service.deactivate(id);
  }

  @Post(':id/reactivate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reactivate user' })
  reactivate(@Param('id', ParseIntPipe) id: number) {
    return this.service.reactivate(id);
  }

  @Post(':id/unfreeze')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Unfreeze a user account' })
  unfreeze(@Param('id', ParseIntPipe) id: number) {
    return this.service.unfreeze(id);
  }
}
