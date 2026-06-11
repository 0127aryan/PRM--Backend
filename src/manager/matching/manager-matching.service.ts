import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtAccessPayload } from '../../auth/interfaces/jwt-payload.interface';
import { KeywordMatcherService } from '../../matching/keyword-matcher.service';
import { EmployeeMatchCandidate } from '../../matching/matching.types';
import { Project } from '../../database/entities/project.entity';
import { Resource } from '../../database/entities/resource.entity';
import { ManagerContextService } from '../manager-context.service';
import { MatchingSearchDto } from './dto/matching-search.dto';

@Injectable()
export class ManagerMatchingService {
  constructor(
    private readonly managerContext: ManagerContextService,
    private readonly keywordMatcher: KeywordMatcherService,
    @InjectRepository(Resource)
    private readonly resources: Repository<Resource>,
    @InjectRepository(Project)
    private readonly projects: Repository<Project>,
  ) {}

  async search(user: JwtAccessPayload, dto: MatchingSearchDto) {
    const manager = await this.managerContext.requireManagerUser(user);

    if (dto.projectId) {
      const project = await this.projects.findOne({ where: { id: dto.projectId } });
      if (!project || project.managerId !== manager.id) {
        throw new ForbiddenException('Project is not managed by you');
      }
    }

    const reports = await this.resources.find({
      where: { reportingManagerId: manager.id, isActive: true },
      relations: { user: true, resourceSkills: { skill: true } },
      order: { user: { fullName: 'ASC' } },
    });

    const candidates: EmployeeMatchCandidate[] = reports.map((r) => ({
      employeeId: r.id,
      employeeCode: r.user?.employeeCode ?? '',
      fullName: r.user?.fullName ?? '',
      status: r.status,
      department: r.user?.department ?? '',
      skills: (r.resourceSkills ?? []).map((rs) => ({
        skillId: rs.skillId,
        skillName: rs.skill?.name ?? '',
        skillCategory: rs.skill?.category,
        proficiency: rs.proficiency,
      })),
    }));

    const keywords = dto.keywords ?? [];
    const skillIds = dto.skillIds ?? [];
    const matches = this.keywordMatcher.rankMatches(candidates, keywords, skillIds);

    return {
      mode: 'keyword' as const,
      projectId: dto.projectId ?? null,
      count: matches.length,
      matches,
    };
  }
}
