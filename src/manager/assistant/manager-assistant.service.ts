import { Injectable } from '@nestjs/common';
import { JwtAccessPayload } from '../../auth/interfaces/jwt-payload.interface';
import { RiskSummaryService } from '../../matching/risk-summary.service';
import { ManagerMatchingService } from '../matching/manager-matching.service';
import { ManagerProjectsService } from '../projects/manager-projects.service';
import { AssistantRiskSummaryDto } from './dto/assistant-risk-summary.dto';
import { AssistantSkillMatchDto } from './dto/assistant-skill-match.dto';

@Injectable()
export class ManagerAssistantService {
  constructor(
    private readonly matching: ManagerMatchingService,
    private readonly projects: ManagerProjectsService,
    private readonly riskSummaryBuilder: RiskSummaryService,
  ) {}

  skillMatch(user: JwtAccessPayload, dto: AssistantSkillMatchDto) {
    return this.matching.search(user, {
      projectId: dto.projectId,
      keywords: dto.keywords,
      skillIds: dto.skillIds,
    });
  }

  async riskSummary(user: JwtAccessPayload, dto: AssistantRiskSummaryDto) {
    const project = await this.projects.findOne(user, dto.projectId);
    const flagsResult = await this.projects.riskFlags(user, dto.projectId);
    return this.riskSummaryBuilder.buildSummary({
      projectId: project.id,
      projectName: project.name,
      health: project.health,
      flags: flagsResult.flags,
    });
  }
}
