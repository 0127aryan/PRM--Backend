import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Project } from './project.entity';
import { TimesheetEntryTag } from './timesheet-entry-tag.entity';
import { TimesheetWeek } from './timesheet-week.entity';

@Entity('timesheet_entries')
export class TimesheetEntry {
  @PrimaryGeneratedColumn({ type: 'int' })
  id!: number;

  @Column({ name: 'timesheet_week_id', type: 'int' })
  timesheetWeekId!: number;

  @Column({ name: 'project_id', type: 'int' })
  projectId!: number;

  @Column({ type: 'smallint' })
  hours!: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp', precision: 3 })
  createdAt!: Date;

  @ManyToOne(() => TimesheetWeek, (week) => week.entries, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'timesheet_week_id' })
  timesheetWeek!: TimesheetWeek;

  @ManyToOne(() => Project, (project) => project.timesheetEntries, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'project_id' })
  project!: Project;

  @OneToMany(() => TimesheetEntryTag, (tag) => tag.timesheetEntry)
  tags?: TimesheetEntryTag[];
}
