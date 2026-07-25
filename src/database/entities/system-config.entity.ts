import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity('system_config')
export class SystemConfig {
  @PrimaryColumn({ name: 'config_key', type: 'varchar', length: 64 })
  configKey!: string;

  @Column({ name: 'config_value', type: 'text' })
  configValue!: string;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp', precision: 3 })
  updatedAt!: Date;
}
