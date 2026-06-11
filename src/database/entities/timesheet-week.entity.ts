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
import { TimesheetWeekStatus } from '../enums';
import { Resource } from './resource.entity';
import { TimesheetEntry } from './timesheet-entry.entity';

@Entity('timesheet_weeks')
export class TimesheetWeek {
  @PrimaryGeneratedColumn({ type: 'int' })
  id!: number;

  @Column({ name: 'resource_id', type: 'int' })
  resourceId!: number;

  @Column({ name: 'week_start', type: 'date' })
  weekStart!: string;

  @Column({ type: 'enum', enum: TimesheetWeekStatus })
  status!: TimesheetWeekStatus;

  @Column({ name: 'submitted_at', type: 'timestamp', precision: 3, nullable: true })
  submittedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp', precision: 3 })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp', precision: 3 })
  updatedAt!: Date;

  @ManyToOne(() => Resource, (resource) => resource.timesheetWeeks, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'resource_id' })
  resource!: Resource;

  @OneToMany(() => TimesheetEntry, (entry) => entry.timesheetWeek)
  entries?: TimesheetEntry[];
}
