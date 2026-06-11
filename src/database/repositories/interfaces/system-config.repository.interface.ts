import { SystemConfig } from '../../entities/system-config.entity';

export interface ISystemConfigRepository {
  findByKey(configKey: string): Promise<SystemConfig | null>;
  create(configKey: string, configValue: string): Promise<SystemConfig>;
}
