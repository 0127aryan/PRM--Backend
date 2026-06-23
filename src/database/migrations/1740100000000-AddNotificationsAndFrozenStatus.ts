import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddNotificationsAndFrozenStatus1740100000000 implements MigrationInterface {
  name = 'AddNotificationsAndFrozenStatus1740100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Add 'FROZEN' to the account_status enum type
    await queryRunner.query(
      `ALTER TYPE account_status ADD VALUE IF NOT EXISTS 'FROZEN'`,
    );

    // 2. Create notifications table
    await queryRunner.query(`
      CREATE TABLE notifications (
        id SERIAL PRIMARY KEY,
        user_id INT NOT NULL,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        type VARCHAR(64) NOT NULL,
        is_read BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES users (id)
          ON DELETE CASCADE ON UPDATE CASCADE
      );
    `);

    // Add indexes for optimization
    await queryRunner.query(`
      CREATE INDEX idx_notifications_user_id ON notifications (user_id);
      CREATE INDEX idx_notifications_is_read ON notifications (is_read);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 1. Drop notifications table
    await queryRunner.query(`DROP TABLE IF EXISTS notifications CASCADE`);

    // Note: Reverting enum additions in PostgreSQL is complex and typically not required in down migrations,
    // as unused enum values do not disrupt operations.
  }
}
