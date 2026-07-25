import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ProjectHealth, ProjectStatus } from '../enums';
import { Allocation } from './allocation.entity';
import { Milestone } from './milestone.entity';
import { TimesheetEntry } from './timesheet-entry.entity';
import { User } from './user.entity';

@Entity('projects')
export class Project {
  @PrimaryGeneratedColumn({ type: 'int' })
  id!: number;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ name: 'start_date', type: 'date' })
  startDate!: string;

  @Column({ name: 'end_date', type: 'date' })
  endDate!: string;

  @Column({
    type: 'enum',
    enum: ProjectStatus,
    default: ProjectStatus.PLANNED,
  })
  status!: ProjectStatus;

  @Column({ name: 'manager_id', type: 'int' })
  managerId!: number;

  @Column({
    type: 'enum',
    enum: ProjectHealth,
    default: ProjectHealth.ON_TRACK,
  })
  health!: ProjectHealth;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp', precision: 3 })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp', precision: 3 })
  updatedAt!: Date;

  @ManyToOne(() => User, (user) => user.managedProjects, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'manager_id' })
  manager!: User;

  @OneToMany(() => Milestone, (milestone) => milestone.project)
  milestones?: Milestone[];

  @OneToMany(() => Allocation, (allocation) => allocation.project)
  allocations?: Allocation[];

  @OneToMany(() => TimesheetEntry, (entry) => entry.project)
  timesheetEntries?: TimesheetEntry[];
}
