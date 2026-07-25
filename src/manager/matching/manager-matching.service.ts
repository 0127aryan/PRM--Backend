import { ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { JwtAccessPayload } from '../../auth/interfaces/jwt-payload.interface';
import { availableUtilizationOnDate } from '../../matching/allocation-availability.util';
import { KeywordMatcherService } from '../../matching/keyword-matcher.service';
import { LlmMatcherService } from '../../matching/llm-matcher.service';
import { LlmRequirementParserService } from '../../matching/llm-requirement-parser.service';
import { MatchingConfigService } from '../../matching/matching-config.service';
import { EmployeeMatchCandidate } from '../../matching/matching.types';
import { ParsedRequirement } from '../../matching/parsed-requirement.types';
import {
  parseRequirement,
  passesRequirementFilters,
} from '../../matching/parse-requirement.util';
import { LlmAvailabilityService } from '../../llm/llm-availability.service';
import { LlmConfigService } from '../../llm/llm-config.service';
import { Allocation } from '../../database/entities/allocation.entity';
import { Project } from '../../database/entities/project.entity';
import { Resource } from '../../database/entities/resource.entity';
import {
  formatRequestedSkills,
  hasSkillFilter,
} from '../../matching/matching-skill-filter.util';
import { RankedEmployeeMatch } from '../../matching/matching.types';
import { ManagerContextService } from '../manager-context.service';
import { MatchingSearchDto } from './dto/matching-search.dto';

@Injectable()
export class ManagerMatchingService {
  private readonly logger = new Logger(ManagerMatchingService.name);

  constructor(
    private readonly managerContext: ManagerContextService,
    private readonly keywordMatcher: KeywordMatcherService,
    private readonly llmMatcher: LlmMatcherService,
    private readonly llmRequirementParser: LlmRequirementParserService,
    private readonly matchingConfig: MatchingConfigService,
    private readonly llmConfig: LlmConfigService,
    private readonly llmAvailability: LlmAvailabilityService,
    @InjectRepository(Resource)
    private readonly resources: Repository<Resource>,
    @InjectRepository(Allocation)
    private readonly allocations: Repository<Allocation>,
    @InjectRepository(Project)
    private readonly projects: Repository<Project>,
  ) {}

  async search(user: JwtAccessPayload, dto: MatchingSearchDto) {
    const manager = await this.managerContext.requireManagerUser(user);

    if (dto.projectId) {
      const project = await this.projects.findOne({
        where: { id: dto.projectId },
      });
      if (!project || project.managerId !== manager.id) {
        throw new ForbiddenException('Project is not managed by you');
      }
    }

    const query = dto.query?.trim() ?? '';
    const matchingMode = await this.matchingConfig.getMatchingMode();
    const llmReady = await this.llmConfig.isConfigured();
    const llmReachable = llmReady
      ? await this.llmAvailability.isReachable()
      : false;
    const useLlmRanking =
      llmReady && llmReachable && matchingMode === 'llm' && query.length > 0;

    const parsed = await this.resolveParsedRequirement(
      query,
      dto,
      llmReady && llmReachable,
    );

    const keywords = dto.keywords?.length ? dto.keywords : parsed.keywords;
    const skillIds = dto.skillIds?.length ? dto.skillIds : parsed.skillIds;

    const reports = await this.fetchReportsForRequirement(manager.id, parsed);
    const availabilityByResourceId = await this.loadAvailabilityByResourceId(
      reports.map((report) => report.id),
    );

    const candidates: EmployeeMatchCandidate[] = reports
      .map((r) => ({
        employeeId: r.id,
        employeeCode: r.user?.employeeCode ?? '',
        fullName: r.user?.fullName ?? '',
        status: r.status,
        department: r.user?.department ?? '',
        availableUtilizationPct: availabilityByResourceId.get(r.id) ?? 100,
        skills: (r.resourceSkills ?? []).map((rs) => ({
          skillId: rs.skillId,
          skillName: rs.skill?.name ?? '',
          skillCategory: rs.skill?.category,
          proficiency: rs.proficiency,
        })),
      }))
      .filter((candidate) => passesRequirementFilters(candidate, parsed));

    const llmNotice =
      llmReady && !llmReachable
        ? 'LLM host is unreachable; using structured search from your requirement.'
        : undefined;

    const skillFilterActive = hasSkillFilter(parsed, keywords, skillIds);

    if (candidates.length === 0) {
      return {
        mode: 'keyword' as const,
        projectId: dto.projectId ?? null,
        count: 0,
        matches: [],
        parsedRequirement: this.exposeParsed(parsed),
        notice: this.noMatchesNotice(parsed, keywords, skillFilterActive),
        ...(llmNotice ? { llmNotice } : {}),
      };
    }

    const requirement = { ...parsed, keywords, skillIds };

    const { matches, mode } = await this.resolveMatches(
      candidates,
      query,
      requirement,
      keywords,
      skillIds,
      skillFilterActive,
      useLlmRanking,
    );

    if (matches.length === 0) {
      return {
        mode,
        projectId: dto.projectId ?? null,
        count: 0,
        matches: [],
        teamSize: candidates.length,
        parsedRequirement: this.exposeParsed(parsed),
        notice: this.noMatchesNotice(parsed, keywords, skillFilterActive),
        ...(llmNotice ? { llmNotice } : {}),
      };
    }

    return {
      mode,
      projectId: dto.projectId ?? null,
      count: matches.length,
      matches,
      teamSize: candidates.length,
      parsedRequirement: this.exposeParsed(parsed),
      ...(llmNotice ? { llmNotice } : {}),
      ...(!query.length
        ? { notice: 'Provide a natural language query to search your team.' }
        : {}),
    };
  }

  private async resolveMatches(
    candidates: EmployeeMatchCandidate[],
    query: string,
    parsed: ParsedRequirement,
    keywords: string[],
    skillIds: number[],
    skillFilterActive: boolean,
    useLlmRanking: boolean,
  ): Promise<{ matches: RankedEmployeeMatch[]; mode: 'llm' | 'keyword' }> {
    const keywordMatches = this.keywordMatcher.rankMatches(
      candidates,
      keywords,
      skillIds,
      parsed,
    );

    if (!useLlmRanking) {
      return { matches: keywordMatches, mode: 'keyword' };
    }

    try {
      const llmMatches = await this.llmMatcher.rankMatches(
        candidates,
        query,
        parsed,
      );
      const matches = skillFilterActive
        ? this.overlayLlmOnKeywordMatches(keywordMatches, llmMatches)
        : llmMatches.length > 0
          ? llmMatches
          : keywordMatches;
      return { matches, mode: 'llm' };
    } catch (error) {
      this.logger.warn(
        `LLM skill match failed, using structured search: ${
          error instanceof Error ? error.message : 'unknown error'
        }`,
      );
      this.llmAvailability.markUnavailable(
        error instanceof Error ? error.message : 'LLM rank failed',
      );
      return { matches: keywordMatches, mode: 'keyword' };
    }
  }

  private overlayLlmOnKeywordMatches(
    keywordMatches: RankedEmployeeMatch[],
    llmMatches: RankedEmployeeMatch[],
  ): RankedEmployeeMatch[] {
    const llmById = new Map(
      llmMatches.map((match) => [match.employeeId, match]),
    );

    return keywordMatches
      .map((keywordMatch) => {
        const llmMatch = llmById.get(keywordMatch.employeeId);
        if (!llmMatch) {
          return keywordMatch;
        }

        return {
          ...keywordMatch,
          score: llmMatch.score,
          reasons:
            llmMatch.reasons.length > 0
              ? llmMatch.reasons
              : keywordMatch.reasons,
          matchedSkills:
            keywordMatch.matchedSkills.length > 0
              ? keywordMatch.matchedSkills
              : llmMatch.matchedSkills,
        };
      })
      .sort(
        (a, b) => b.score - a.score || a.fullName.localeCompare(b.fullName),
      );
  }

  private async resolveParsedRequirement(
    query: string,
    dto: MatchingSearchDto,
    useLlmParser: boolean,
  ): Promise<ParsedRequirement> {
    if (!query.length) {
      return {
        keywords: dto.keywords ?? [],
        skillIds: dto.skillIds ?? [],
        skillCategories: [],
      };
    }

    if (useLlmParser) {
      return this.llmRequirementParser.parse(query);
    }

    return parseRequirement(query);
  }

  private async fetchReportsForRequirement(
    managerId: number,
    parsed: ParsedRequirement,
  ): Promise<Resource[]> {
    const qb = this.resources
      .createQueryBuilder('resource')
      .innerJoinAndSelect('resource.user', 'user')
      .leftJoinAndSelect('resource.resourceSkills', 'resourceSkills')
      .leftJoinAndSelect('resourceSkills.skill', 'skill')
      .where('resource.reporting_manager_id = :managerId', { managerId })
      .andWhere('resource.is_active = true');

    if (parsed.requiredStatus) {
      qb.andWhere('resource.status = :status', {
        status: parsed.requiredStatus,
      });
    }

    if (parsed.requiredUtilizationPct !== undefined) {
      qb.andWhere(
        `100 - COALESCE((
          SELECT SUM(a.utilization_pct)
          FROM allocations a
          WHERE a.resource_id = resource.id
            AND a.is_active = true
            AND a.from_date <= CURRENT_DATE
            AND a.to_date >= CURRENT_DATE
        ), 0) >= :minAvailable`,
        { minAvailable: parsed.requiredUtilizationPct },
      );
    }

    qb.orderBy('user.full_name', 'ASC');
    return qb.getMany();
  }

  private async loadAvailabilityByResourceId(
    resourceIds: number[],
  ): Promise<Map<number, number>> {
    if (!resourceIds.length) {
      return new Map();
    }

    const rows = await this.allocations.find({
      where: { resourceId: In(resourceIds), isActive: true },
    });

    return new Map(
      resourceIds.map((resourceId) => [
        resourceId,
        availableUtilizationOnDate(
          rows.filter((row) => row.resourceId === resourceId),
        ),
      ]),
    );
  }

  private noMatchesNotice(
    parsed: ParsedRequirement,
    keywords: string[],
    skillFilterActive: boolean,
  ): string {
    const skillLabel = formatRequestedSkills(parsed, keywords);

    if (skillFilterActive) {
      if (parsed.requiredUtilizationPct !== undefined) {
        return `No direct reports have ${skillLabel} with at least ${parsed.requiredUtilizationPct}% allocation available.`;
      }
      return `No direct reports have the requested skill(s): ${skillLabel}.`;
    }

    if (parsed.requiredUtilizationPct !== undefined) {
      return `No direct reports with at least ${parsed.requiredUtilizationPct}% allocation available.`;
    }
    if (parsed.requiredStatus) {
      return `No active direct reports on ${parsed.requiredStatus.toLowerCase()} for this manager.`;
    }
    return 'No active direct reports found. Assign employees to this manager in Admin.';
  }

  private exposeParsed(parsed: ParsedRequirement) {
    return {
      keywords: parsed.keywords,
      requiredStatus: parsed.requiredStatus ?? null,
      minProficiency: parsed.minProficiency ?? null,
      skillCategories: parsed.skillCategories,
      requiredUtilizationPct: parsed.requiredUtilizationPct ?? null,
    };
  }
}
