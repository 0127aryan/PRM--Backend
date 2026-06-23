import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { SkillCategory } from '../enums';
import { ResourceSkill } from './resource-skill.entity';

@Entity('skills')
export class Skill {
  @PrimaryGeneratedColumn({ type: 'int' })
  id!: number;

  @Column({ type: 'varchar', length: 128, unique: true })
  name!: string;

  @Column({ type: 'enum', enum: SkillCategory })
  category!: SkillCategory;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp', precision: 3 })
  createdAt!: Date;

  @OneToMany(() => ResourceSkill, (rs) => rs.skill)
  resourceSkills?: ResourceSkill[];
}
