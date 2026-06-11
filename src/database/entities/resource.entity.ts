import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ResourceStatus } from '../enums';
import { Allocation } from './allocation.entity';
import { ResourceSkill } from './resource-skill.entity';
import { TimesheetWeek } from './timesheet-week.entity';
import { User } from './user.entity';

@Entity('resources')
export class Resource {
  @PrimaryGeneratedColumn({ type: 'int' })
  id!: number;

  @Column({ name: 'user_id', type: 'int', unique: true })
  userId!: number;

  @Column({ name: 'reporting_manager_id', type: 'int', nullable: true })
  reportingManagerId!: number | null;

  @Column({ type: 'enum', enum: ResourceStatus, default: ResourceStatus.BENCH })
  status!: ResourceStatus;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp', precision: 3 })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp', precision: 3 })
  updatedAt!: Date;

  @OneToOne(() => User, (user) => user.resource, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @ManyToOne(() => User, (manager) => manager.directReports, {
    onDelete: 'RESTRICT',
    nullable: true,
  })
  @JoinColumn({ name: 'reporting_manager_id' })
  reportingManager!: User | null;

  @OneToMany(() => ResourceSkill, (rs) => rs.resource)
  resourceSkills?: ResourceSkill[];

  @OneToMany(() => Allocation, (allocation) => allocation.resource)
  allocations?: Allocation[];

  @OneToMany(() => TimesheetWeek, (week) => week.resource)
  timesheetWeeks?: TimesheetWeek[];
}
