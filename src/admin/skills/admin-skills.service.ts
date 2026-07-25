import { ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Skill } from '../../database/entities/skill.entity';
import { CreateSkillDto } from './dto/create-skill.dto';

@Injectable()
export class AdminSkillsService {
  constructor(
    @InjectRepository(Skill)
    private readonly skills: Repository<Skill>,
  ) {}

  list() {
    return this.skills.find({ order: { name: 'ASC' } });
  }

  async create(dto: CreateSkillDto) {
    const existing = await this.skills.findOne({
      where: { name: dto.name.trim() },
    });
    if (existing) {
      throw new ConflictException('Skill name already exists');
    }
    return this.skills.save(
      this.skills.create({
        name: dto.name.trim(),
        category: dto.category,
      }),
    );
  }
}
