import { Inject, Injectable } from '@nestjs/common';
import { SYSTEM_CONFIG_REPOSITORY } from '../database/repositories/repository.tokens';
import type { ISystemConfigRepository } from '../database/repositories/interfaces/system-config.repository.interface';

export type MatchingMode = 'keyword' | 'llm';

@Injectable()
export class MatchingConfigService {
  constructor(
    @Inject(SYSTEM_CONFIG_REPOSITORY)
    private readonly systemConfig: ISystemConfigRepository,
  ) {}

  async getMatchingMode(): Promise<MatchingMode> {
    const row = await this.systemConfig.findByKey('matching_mode');
    return row?.configValue?.trim().toLowerCase() === 'llm' ? 'llm' : 'keyword';
  }
}
