import { ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ActivityTag } from '../../database/entities/activity-tag.entity';
import { SystemConfig } from '../../database/entities/system-config.entity';
import { CreateActivityTagDto } from './dto/patch-config.dto';

@Injectable()
export class AdminSettingsService {
  constructor(
    @InjectRepository(SystemConfig)
    private readonly config: Repository<SystemConfig>,
    @InjectRepository(ActivityTag)
    private readonly activityTags: Repository<ActivityTag>,
  ) {}

  async getConfig(): Promise<Record<string, string>> {
    const rows = await this.config.find({ order: { configKey: 'ASC' } });
    return Object.fromEntries(rows.map((r) => [r.configKey, r.configValue]));
  }

  async patchConfig(values: Record<string, string>): Promise<Record<string, string>> {
    for (const [configKey, configValue] of Object.entries(values)) {
      const key = configKey.trim();
      if (!key) continue;
      const existing = await this.config.findOne({ where: { configKey: key } });
      if (existing) {
        existing.configValue = String(configValue);
        await this.config.save(existing);
      } else {
        await this.config.save(this.config.create({ configKey: key, configValue: String(configValue) }));
      }
    }
    return this.getConfig();
  }

  listActivityTags() {
    return this.activityTags.find({ order: { sortOrder: 'ASC', name: 'ASC' } });
  }

  async createActivityTag(dto: CreateActivityTagDto) {
    const name = dto.name.trim();
    if (await this.activityTags.findOne({ where: { name } })) {
      throw new ConflictException('Activity tag already exists');
    }
    const max = await this.activityTags
      .createQueryBuilder('t')
      .select('MAX(t.sort_order)', 'max')
      .getRawOne<{ max: number | null }>();
    const sortOrder = (max?.max ?? 0) + 1;
    return this.activityTags.save(
      this.activityTags.create({ name, sortOrder, isActive: true }),
    );
  }
}
