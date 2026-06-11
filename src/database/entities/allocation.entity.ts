import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Project } from './project.entity';
import { Resource } from './resource.entity';

@Entity('allocations')
export class Allocation {
  @PrimaryGeneratedColumn({ type: 'int' })
  id!: number;

  @Column({ name: 'resource_id', type: 'int' })
  resourceId!: number;

  @Column({ name: 'project_id', type: 'int' })
  projectId!: number;

  @Column({ name: 'utilization_pct', type: 'smallint' })
  utilizationPct!: number;

  @Column({ name: 'from_date', type: 'date' })
  fromDate!: string;

  @Column({ name: 'to_date', type: 'date' })
  toDate!: string;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp', precision: 3 })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp', precision: 3 })
  updatedAt!: Date;

  @ManyToOne(() => Resource, (resource) => resource.allocations, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'resource_id' })
  resource!: Resource;

  @ManyToOne(() => Project, (project) => project.allocations, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'project_id' })
  project!: Project;
}
