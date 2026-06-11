import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { AccountStatus, UserRole } from '../enums';
import { PasswordSetupToken } from './password-setup-token.entity';
import { Project } from './project.entity';
import { RefreshToken } from './refresh-token.entity';
import { Resource } from './resource.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn({ type: 'int' })
  id!: number;

  @Column({ type: 'varchar', length: 64, unique: true })
  username!: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  email!: string;

  @Column({ name: 'password_hash', type: 'varchar', length: 255, nullable: true })
  passwordHash!: string | null;

  @Column({ type: 'enum', enum: UserRole })
  role!: UserRole;

  @Column({ name: 'employee_code', type: 'varchar', length: 32, unique: true, nullable: true })
  employeeCode!: string | null;

  @Column({ name: 'full_name', type: 'varchar', length: 255, nullable: true })
  fullName!: string | null;

  @Column({ type: 'varchar', length: 128, nullable: true })
  department!: string | null;

  @Column({ type: 'varchar', length: 128, nullable: true })
  designation!: string | null;

  @Column({
    name: 'account_status',
    type: 'enum',
    enum: AccountStatus,
    default: AccountStatus.PENDING_PASSWORD,
  })
  accountStatus!: AccountStatus;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ name: 'force_password_change', type: 'boolean', default: false })
  forcePasswordChange!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp', precision: 3 })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp', precision: 3 })
  updatedAt!: Date;

  @OneToOne(() => Resource, (resource) => resource.user)
  resource?: Resource;

  @OneToMany(() => Resource, (resource) => resource.reportingManager)
  directReports?: Resource[];

  @OneToMany(() => Project, (project) => project.manager)
  managedProjects?: Project[];

  @OneToMany(() => RefreshToken, (token) => token.user)
  refreshTokens?: RefreshToken[];

  @OneToMany(() => PasswordSetupToken, (token) => token.user)
  passwordSetupTokens?: PasswordSetupToken[];
}
