import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { TimesheetEntryTag } from './timesheet-entry-tag.entity';

@Entity('activity_tags')
export class ActivityTag {
  @PrimaryGeneratedColumn({ type: 'int' })
  id!: number;

  @Column({ type: 'varchar', length: 128, unique: true })
  name!: string;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder!: number;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp', precision: 3 })
  createdAt!: Date;

  @OneToMany(() => TimesheetEntryTag, (link) => link.activityTag)
  timesheetEntryTags?: TimesheetEntryTag[];
}
