import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ActivityTag } from '../database/entities/activity-tag.entity';

@Injectable()
export class EmployeeActivityTagsService {
  constructor(
    @InjectRepository(ActivityTag)
    private readonly tags: Repository<ActivityTag>,
  ) {}

  listActive() {
    return this.tags.find({
      where: { isActive: true },
      order: { sortOrder: 'ASC', name: 'ASC' },
    });
  }
}
