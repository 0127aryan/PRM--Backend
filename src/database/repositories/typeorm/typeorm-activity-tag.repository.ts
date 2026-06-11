import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ActivityTag } from '../../entities/activity-tag.entity';
import { IActivityTagRepository } from '../interfaces/activity-tag.repository.interface';

@Injectable()
export class TypeOrmActivityTagRepository implements IActivityTagRepository {
  constructor(
    @InjectRepository(ActivityTag)
    private readonly repo: Repository<ActivityTag>,
  ) {}

  findByName(name: string): Promise<ActivityTag | null> {
    return this.repo.findOne({ where: { name } });
  }

  create(name: string, sortOrder: number): Promise<ActivityTag> {
    return this.repo.save({ name, sortOrder, isActive: true });
  }
}
