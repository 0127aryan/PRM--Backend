import { ActivityTag } from '../../entities/activity-tag.entity';

export interface IActivityTagRepository {
  findByName(name: string): Promise<ActivityTag | null>;
  create(name: string, sortOrder: number): Promise<ActivityTag>;
}
