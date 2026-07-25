import { config } from 'dotenv';
import { join } from 'path';
import { DataSource } from 'typeorm';
import { buildTypeOrmOptions } from './typeorm-options';

config({ path: join(__dirname, '../../.env') });

export default new DataSource(
  buildTypeOrmOptions(process.env, join(__dirname, 'migrations')),
);
