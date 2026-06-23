import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SystemConfig } from '../../entities/system-config.entity';
import { ISystemConfigRepository } from '../interfaces/system-config.repository.interface';

@Injectable()
export class TypeOrmSystemConfigRepository implements ISystemConfigRepository {
  constructor(
    @InjectRepository(SystemConfig)
    private readonly repo: Repository<SystemConfig>,
  ) {}

  findByKey(configKey: string): Promise<SystemConfig | null> {
    return this.repo.findOne({ where: { configKey } });
  }

  create(configKey: string, configValue: string): Promise<SystemConfig> {
    return this.repo.save({ configKey, configValue });
  }
}
