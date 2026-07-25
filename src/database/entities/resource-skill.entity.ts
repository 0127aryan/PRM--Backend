import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import { Proficiency } from '../enums';
import { Resource } from './resource.entity';
import { Skill } from './skill.entity';

@Entity('resource_skills')
export class ResourceSkill {
  @PrimaryColumn({ name: 'resource_id', type: 'int' })
  resourceId!: number;

  @PrimaryColumn({ name: 'skill_id', type: 'int' })
  skillId!: number;

  @Column({ type: 'enum', enum: Proficiency })
  proficiency!: Proficiency;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp', precision: 3 })
  createdAt!: Date;

  @ManyToOne(() => Resource, (resource) => resource.resourceSkills, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'resource_id' })
  resource!: Resource;

  @ManyToOne(() => Skill, (skill) => skill.resourceSkills, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'skill_id' })
  skill!: Skill;
}
