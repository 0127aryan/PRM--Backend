import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole } from '../../database/enums';
import type { JwtAccessPayload } from '../../auth/interfaces/jwt-payload.interface';
import { BuildTeamDto } from './dto/build-team.dto';
import {
  ManagerTeamBuilderService,
  LlmTeamResponse,
} from './manager-team-builder.service';

@ApiTags('manager/team-builder')
@Roles(UserRole.MANAGER)
@Controller('manager/team-builder')
export class ManagerTeamBuilderController {
  constructor(private readonly service: ManagerTeamBuilderService) {}

  @Post()
  @ApiOperation({
    summary:
      'Build team recommendations based on a natural language query using AI',
  })
  buildTeam(
    @CurrentUser() user: JwtAccessPayload,
    @Body() dto: BuildTeamDto,
  ): Promise<any> {
    return this.service.buildTeam(user, dto);
  }
}
