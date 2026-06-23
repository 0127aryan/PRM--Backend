import { config } from 'dotenv';
import { join } from 'path';
import { DataSource } from 'typeorm';
import { buildTypeOrmOptions } from './src/database/typeorm-options';
import { User } from './src/database/entities/user.entity';

config({ path: join(__dirname, '.env') });

const ds = new DataSource(
  buildTypeOrmOptions(process.env, join(__dirname, 'src/database/migrations')),
);

async function run() {
  await ds.initialize();
  try {
    const users = await ds.getRepository(User).find();
    console.log('--- ALL USERS IN DB ---');
    users.forEach((u) => {
      console.log(`ID: ${u.id} | Name: ${u.fullName || u.username} | Email: ${u.email} | Status: ${u.accountStatus} | IsActive: ${u.isActive} | Role: ${u.role}`);
    });
  } catch (err) {
    console.error(err);
  } finally {
    await ds.destroy();
  }
}

run();
