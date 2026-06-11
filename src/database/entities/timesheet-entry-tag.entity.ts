import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ActivityTag } from './activity-tag.entity';
import { TimesheetEntry } from './timesheet-entry.entity';

@Entity('timesheet_entry_tags')
export class TimesheetEntryTag {
  @PrimaryGeneratedColumn({ type: 'int' })
  id!: number;

  @Column({ name: 'timesheet_entry_id', type: 'int' })
  timesheetEntryId!: number;

  @Column({ name: 'activity_tag_id', type: 'int', nullable: true })
  activityTagId!: number | null;

  @Column({ name: 'other_text', type: 'varchar', length: 128, nullable: true })
  otherText!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp', precision: 3 })
  createdAt!: Date;

  @ManyToOne(() => TimesheetEntry, (entry) => entry.tags, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'timesheet_entry_id' })
  timesheetEntry!: TimesheetEntry;

  @ManyToOne(() => ActivityTag, (tag) => tag.timesheetEntryTags, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  @JoinColumn({ name: 'activity_tag_id' })
  activityTag!: ActivityTag | null;
}
