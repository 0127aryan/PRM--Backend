import { Body, Controller, Get, Patch, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole } from '../../database/enums';
import { AdminSettingsService } from './admin-settings.service';
import { CreateActivityTagDto, PatchConfigDto } from './dto/patch-config.dto';

@ApiTags('admin/settings')
@Roles(UserRole.ADMIN)
@Controller('admin/settings')
export class AdminSettingsController {
  constructor(private readonly service: AdminSettingsService) {}

  @Get('config')
  @ApiOperation({ summary: 'All system_config key-value pairs' })
  getConfig() {
    return this.service.getConfig();
  }

  @Patch('config')
  @ApiOperation({ summary: 'Upsert system_config entries' })
  patchConfig(@Body() dto: PatchConfigDto) {
    return this.service.patchConfig(dto.values);
  }

  @Get('activity-tags')
  listActivityTags() {
    return this.service.listActivityTags();
  }

  @Post('activity-tags')
  createActivityTag(@Body() dto: CreateActivityTagDto) {
    return this.service.createActivityTag(dto);
  }
}
