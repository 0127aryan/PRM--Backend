import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtAccessPayload } from '../../auth/interfaces/jwt-payload.interface';
import { Resource } from '../../database/entities/resource.entity';
import { LlmClientService } from '../../llm/llm-client.service';
import { LlmConfigService } from '../../llm/llm-config.service';
import { LlmAvailabilityService } from '../../llm/llm-availability.service';
import { availableUtilizationOnDate } from '../../matching/allocation-availability.util';
import { BuildTeamDto } from './dto/build-team.dto';

export interface LlmTeamMember {
  resourceId: number;
  fullName: string;
  role: string;
  skills: string[];
  availableUtilizationPct: number;
  matchReason: string;
}

export interface LlmTeamOption {
  optionName: string;
  description: string;
  members: LlmTeamMember[];
}

export interface LlmTeamGap {
  role: string;
  reason: string;
  type: 'NO_SKILL' | 'ALLOCATED_ELSEWHERE';
}

export interface LlmTeamResponse {
  options: LlmTeamOption[];
  gaps: LlmTeamGap[];
}

@Injectable()
export class ManagerTeamBuilderService {
  private readonly logger = new Logger(ManagerTeamBuilderService.name);

  constructor(
    private readonly llm: LlmClientService,
    private readonly llmConfig: LlmConfigService,
    private readonly llmAvailability: LlmAvailabilityService,
    @InjectRepository(Resource)
    private readonly resources: Repository<Resource>,
  ) {}

  async buildTeam(
    user: JwtAccessPayload,
    dto: BuildTeamDto,
  ): Promise<LlmTeamResponse> {
    const llmReady = await this.llmConfig.isConfigured();
    const llmReachable = llmReady
      ? await this.llmAvailability.isReachable()
      : false;

    if (!llmReady || !llmReachable) {
      throw new BadRequestException(
        'AI Team Builder service is currently unavailable or unconfigured in Admin settings.',
      );
    }

    const query = dto.query?.trim() ?? '';
    if (!query) {
      throw new BadRequestException(
        'A description of the team requirements is required.',
      );
    }

    // Query ALL active resources from all over the organization
    const activeResources = await this.resources.find({
      where: { isActive: true },
      relations: [
        'user',
        'resourceSkills',
        'resourceSkills.skill',
        'allocations',
        'allocations.project',
      ],
    });

    const candidates = activeResources.map((r) => {
      const activeAllocations = (r.allocations ?? []).filter((a) => a.isActive);
      const availablePct = availableUtilizationOnDate(activeAllocations);
      return {
        resourceId: r.id,
        employeeCode: r.user?.employeeCode ?? '',
        fullName: r.user?.fullName ?? '',
        status: r.status,
        department: r.user?.department ?? '',
        availableUtilizationPct: availablePct,
        skills: (r.resourceSkills ?? []).map((rs) => ({
          skillId: rs.skillId,
          skillName: rs.skill?.name ?? '',
          skillCategory: rs.skill?.category,
          proficiency: rs.proficiency,
        })),
        activeAllocations: activeAllocations.map((a) => ({
          projectName: a.project?.name ?? 'Unknown Project',
          utilizationPct: a.utilizationPct,
          fromDate: a.fromDate,
          toDate: a.toDate,
        })),
      };
    });

    const prompt = this.buildPrompt(query, candidates);

    try {
      const raw = await this.llm.complete(prompt, {
        jsonMode: true,
        temperature: 0.2,
      });
      const parsed = this.parseResponse(raw);
      return parsed;
    } catch (error) {
      this.logger.error(
        `AI team building failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw new BadRequestException(
        `Failed to generate team options using AI: ${error instanceof Error ? error.message : 'Unknown LLM error'}`,
      );
    }
  }

  private buildPrompt(query: string, candidates: any[]): string {
    return [
      'You are a resource management and team builder AI assistant for an IT organization.',
      'Given a manager requirement for a team (roles, skills, structure) and a list of all active employees (candidates) in the organization, your goal is to construct at least 2 distinct team options and identify any gaps.',
      '',
      'Constraint Rules:',
      '1. Suggest members ONLY from the candidates list. Do NOT invent or fabricate any candidates.',
      '2. Candidate Availability: Candidates with any availableUtilizationPct can be assigned, but you should prioritize candidates with higher availableUtilizationPct (e.g., closer to 100) where possible. You MUST include their exact availableUtilizationPct in the output member object.',
      '3. Strict Skill & Technology Match: If the manager request specifies a role or technology (e.g., "Java Developer", "DevOps", "QA"), only select candidates who explicitly possess those skills or technologies. Do NOT substitute technology stacks (e.g., do NOT match a Node.js developer to a Java role). If no matching candidate exists in the organization, leave the role empty in that option and report a gap.',
      '4. Exact Role Satisfaction: Both team options must attempt to satisfy the exact same roles/technologies requested. Do not change the roles or suggest a differently-focused team (e.g., both options should target Senior Java Developer, DevOps, and QA).',
      '5. Allowed Member Overlap: The two options are allowed to share one or more of the same candidates if choices are limited. However, at least one candidate must be different between Option 1 and Option 2 to make the overall teams distinct. If a role has only one qualified candidate in the entire organization, assign them to that role in both options, and vary other roles where options exist.',
      '6. NO DUPLICATE MEMBERS (CRITICAL): Within the same team option, a candidate can be assigned at most ONCE. You must never repeat the same candidate (no duplicate resourceId) in the members array of a single option. If the request asks for multiple resources of the same type (e.g., "four DevOps", "six nodejs") but you do not have enough distinct matching candidates, assign each distinct matching candidate exactly once, leave the remaining slots unfilled, and list the unfulfilled slots in the gaps array.',
      '7. Honesty about Gaps: If a requested role or count cannot be fully satisfied (e.g., 4 DevOps requested, but you can only assign 2):',
      '   - Log the shortage in the gaps array.',
      '   - If there are other candidates in the organization who have the required skill but are busy/unavailable, state exactly why they are unavailable (e.g. "[Name] has the skill but is allocated to [Project] until [toDate]").',
      '   - If no other candidates in the organization have the skill at all, state that no other employees possess this skill.',
      '8. CONCISENESS RULE (CRITICAL to avoid JSON truncation): Keep option descriptions under 15 words. Keep matchReason under 8 words. Keep gap reasons under 25 words. Do not output any notes or conversational text outside of the JSON block.',

      '',
      `Manager Requirement: ${query}`,
      '',
      `Candidates list: ${JSON.stringify(candidates)}`,
      '',
      'Format your response strictly as a single, valid JSON object with the following schema:',
      '{',
      '  "options": [',
      '    {',
      '      "optionName": "string", // e.g. "Option 1: Recommended Setup"',
      '      "description": "string", // explaining the balance or rationale of this configuration',
      '      "members": [',
      '        {',
      '          "resourceId": number,',
      '          "fullName": "string",',
      '          "role": "string", // the specific role they are assigned to (e.g. "backend", "QA")',
      '          "skills": ["string"], // relevant skills they have matching the role',
      '          "availableUtilizationPct": number, // the candidates availability percentage',
      '          "matchReason": "string" // why they are suited',
      '        }',
      '      ]',
      '    }',
      '  ],',
      '  "gaps": [',
      '    {',
      '      "role": "string", // the role/skill that has a gap',
      '      "reason": "string", // explanation matching the Honesty about Gaps rule',
      '      "type": "NO_SKILL" | "ALLOCATED_ELSEWHERE"',
      '    }',
      '  ]',
      '}',
      'Ensure the JSON is perfectly valid.',
    ].join('\n');
  }

  private parseResponse(raw: string): LlmTeamResponse {
    const jsonText = this.extractJson(raw);
    let parsed: any;
    try {
      parsed = JSON.parse(jsonText);
    } catch (err) {
      this.logger.error(
        `Failed to parse LLM raw response. Raw response was: ${raw}`,
      );
      throw new Error(
        `LLM response was not valid JSON: ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    const options = Array.isArray(parsed.options) ? parsed.options : [];
    const gaps = Array.isArray(parsed.gaps) ? parsed.gaps : [];

    return {
      options: options.map((opt: any) => ({
        optionName:
          typeof opt.optionName === 'string'
            ? opt.optionName
            : 'Suggested Team Option',
        description: typeof opt.description === 'string' ? opt.description : '',
        members: Array.isArray(opt.members)
          ? opt.members
              .filter((m: any) => typeof m?.resourceId === 'number')
              .map((m: any) => ({
                resourceId: m.resourceId,
                fullName: typeof m.fullName === 'string' ? m.fullName : '',
                role: typeof m.role === 'string' ? m.role : '',
                skills: Array.isArray(m.skills)
                  ? m.skills.filter((s: any) => typeof s === 'string')
                  : [],
                availableUtilizationPct:
                  typeof m.availableUtilizationPct === 'number'
                    ? m.availableUtilizationPct
                    : 0,
                matchReason:
                  typeof m.matchReason === 'string' ? m.matchReason : '',
              }))
          : [],
      })),
      gaps: gaps.map((g: any) => ({
        role: typeof g.role === 'string' ? g.role : 'Unknown Role',
        reason: typeof g.reason === 'string' ? g.reason : 'Gap identified.',
        type:
          g.type === 'NO_SKILL' || g.type === 'ALLOCATED_ELSEWHERE'
            ? g.type
            : 'NO_SKILL',
      })),
    };
  }

  private extractJson(raw: string): string {
    const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenced?.[1]) {
      return fenced[1].trim();
    }
    const start = raw.indexOf('{');
    const end = raw.lastIndexOf('}');
    if (start >= 0 && end > start) {
      return raw.slice(start, end + 1);
    }
    return raw.trim();
  }
}
