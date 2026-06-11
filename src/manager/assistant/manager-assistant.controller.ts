import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole } from '../../database/enums';
import type { JwtAccessPayload } from '../../auth/interfaces/jwt-payload.interface';
import { AssistantRiskSummaryDto } from './dto/assistant-risk-summary.dto';
import { AssistantSkillMatchDto } from './dto/assistant-skill-match.dto';
import { ManagerAssistantService } from './manager-assistant.service';

@ApiTags('manager/assistant')
@Roles(UserRole.MANAGER)
@Controller('manager/assistant')
export class ManagerAssistantController {
  constructor(private readonly service: ManagerAssistantService) {}

  @Post('skill-match')
  @ApiOperation({
    summary: 'Keyword skill match for allocate page (scored direct reports + reasons)',
  })
  skillMatch(
    @CurrentUser() user: JwtAccessPayload,
    @Body() dto: AssistantSkillMatchDto,
  ) {
    return this.service.skillMatch(user, dto);
  }

  @Post('risk-summary')
  @ApiOperation({
    summary: 'Template risk summary for project (pre-LLM; uses rule flags)',
  })
  riskSummary(
    @CurrentUser() user: JwtAccessPayload,
    @Body() dto: AssistantRiskSummaryDto,
  ) {
    return this.service.riskSummary(user, dto);
  }
}
