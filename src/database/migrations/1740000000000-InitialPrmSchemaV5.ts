import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * PRM v5 schema for PostgreSQL (Supabase).
 * Mirrors TypeORM entities — users + resources model.
 */
export class InitialPrmSchemaV51740000000000 implements MigrationInterface {
  name = 'InitialPrmSchemaV51740000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE user_role AS ENUM ('ADMIN', 'MANAGER', 'EMPLOYEE');
      CREATE TYPE account_status AS ENUM ('PENDING_PASSWORD', 'ACTIVE', 'INACTIVE');
      CREATE TYPE resource_status AS ENUM ('BENCH', 'ALLOCATED');
      CREATE TYPE skill_category AS ENUM ('BACKEND', 'FRONTEND', 'DEVOPS', 'QA', 'OTHER');
      CREATE TYPE proficiency AS ENUM ('BEGINNER', 'INTERMEDIATE', 'ADVANCED');
      CREATE TYPE project_status AS ENUM ('PLANNED', 'ACTIVE', 'ON_HOLD');
      CREATE TYPE project_health AS ENUM ('ON_TRACK', 'ATTENTION', 'AT_RISK');
      CREATE TYPE milestone_status AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'DONE');
      CREATE TYPE timesheet_week_status AS ENUM ('SUBMITTED', 'MISSED');
    `);

    await queryRunner.query(`
      CREATE TABLE users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(64) NOT NULL,
        email VARCHAR(255) NOT NULL,
        password_hash VARCHAR(255) NULL,
        role user_role NOT NULL,
        employee_code VARCHAR(32) NULL,
        full_name VARCHAR(255) NULL,
        department VARCHAR(128) NULL,
        designation VARCHAR(128) NULL,
        account_status account_status NOT NULL DEFAULT 'PENDING_PASSWORD',
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        force_password_change BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT uk_users_username UNIQUE (username),
        CONSTRAINT uk_users_email UNIQUE (email),
        CONSTRAINT uk_users_employee_code UNIQUE (employee_code)
      );
      CREATE INDEX idx_users_role ON users (role);
      CREATE INDEX idx_users_account_status ON users (account_status);
      CREATE INDEX idx_users_is_active ON users (is_active);
    `);

    await queryRunner.query(`
      CREATE TABLE resources (
        id SERIAL PRIMARY KEY,
        user_id INT NOT NULL,
        reporting_manager_id INT NULL,
        status resource_status NOT NULL DEFAULT 'BENCH',
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT uk_resources_user_id UNIQUE (user_id),
        CONSTRAINT fk_resources_user FOREIGN KEY (user_id) REFERENCES users (id)
          ON DELETE RESTRICT ON UPDATE CASCADE,
        CONSTRAINT fk_resources_reporting_manager FOREIGN KEY (reporting_manager_id) REFERENCES users (id)
          ON DELETE RESTRICT ON UPDATE CASCADE
      );
      CREATE INDEX idx_resources_status ON resources (status);
      CREATE INDEX idx_resources_reporting_manager_id ON resources (reporting_manager_id);
      CREATE INDEX idx_resources_is_active ON resources (is_active);
    `);

    await queryRunner.query(`
      CREATE TABLE skills (
        id SERIAL PRIMARY KEY,
        name VARCHAR(128) NOT NULL,
        category skill_category NOT NULL,
        created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT uk_skills_name UNIQUE (name)
      );
    `);

    await queryRunner.query(`
      CREATE TABLE resource_skills (
        resource_id INT NOT NULL,
        skill_id INT NOT NULL,
        proficiency proficiency NOT NULL,
        created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (resource_id, skill_id),
        CONSTRAINT fk_resource_skills_resource FOREIGN KEY (resource_id) REFERENCES resources (id)
          ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT fk_resource_skills_skill FOREIGN KEY (skill_id) REFERENCES skills (id)
          ON DELETE RESTRICT ON UPDATE CASCADE
      );
    `);

    await queryRunner.query(`
      CREATE TABLE projects (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT NULL,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        status project_status NOT NULL DEFAULT 'PLANNED',
        manager_id INT NOT NULL,
        health project_health NOT NULL DEFAULT 'ON_TRACK',
        created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_projects_manager FOREIGN KEY (manager_id) REFERENCES users (id)
          ON DELETE RESTRICT ON UPDATE CASCADE,
        CONSTRAINT chk_projects_dates CHECK (start_date <= end_date)
      );
      CREATE INDEX idx_projects_manager_id ON projects (manager_id);
      CREATE INDEX idx_projects_status ON projects (status);
      CREATE INDEX idx_projects_health ON projects (health);
    `);

    await queryRunner.query(`
      CREATE TABLE milestones (
        id SERIAL PRIMARY KEY,
        project_id INT NOT NULL,
        title VARCHAR(255) NOT NULL,
        due_date DATE NOT NULL,
        status milestone_status NOT NULL DEFAULT 'NOT_STARTED',
        created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_milestones_project FOREIGN KEY (project_id) REFERENCES projects (id)
          ON DELETE CASCADE ON UPDATE CASCADE
      );
      CREATE INDEX idx_milestones_project_id ON milestones (project_id);
      CREATE INDEX idx_milestones_due_date ON milestones (due_date);
      CREATE INDEX idx_milestones_status ON milestones (status);
    `);

    await queryRunner.query(`
      CREATE TABLE allocations (
        id SERIAL PRIMARY KEY,
        resource_id INT NOT NULL,
        project_id INT NOT NULL,
        utilization_pct SMALLINT NOT NULL,
        from_date DATE NOT NULL,
        to_date DATE NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_allocations_resource FOREIGN KEY (resource_id) REFERENCES resources (id)
          ON DELETE RESTRICT ON UPDATE CASCADE,
        CONSTRAINT fk_allocations_project FOREIGN KEY (project_id) REFERENCES projects (id)
          ON DELETE RESTRICT ON UPDATE CASCADE,
        CONSTRAINT chk_allocations_pct CHECK (utilization_pct BETWEEN 1 AND 100),
        CONSTRAINT chk_allocations_dates CHECK (from_date <= to_date)
      );
      CREATE INDEX idx_allocations_resource_id ON allocations (resource_id);
      CREATE INDEX idx_allocations_project_id ON allocations (project_id);
      CREATE INDEX idx_allocations_active ON allocations (is_active);
      CREATE INDEX idx_allocations_dates ON allocations (from_date, to_date);
    `);

    await queryRunner.query(`
      CREATE TABLE timesheet_weeks (
        id SERIAL PRIMARY KEY,
        resource_id INT NOT NULL,
        week_start DATE NOT NULL,
        status timesheet_week_status NOT NULL,
        submitted_at TIMESTAMP(3) NULL,
        created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT uk_timesheet_weeks_resource_week UNIQUE (resource_id, week_start),
        CONSTRAINT fk_timesheet_weeks_resource FOREIGN KEY (resource_id) REFERENCES resources (id)
          ON DELETE RESTRICT ON UPDATE CASCADE
      );
      CREATE INDEX idx_timesheet_weeks_status ON timesheet_weeks (status);
    `);

    await queryRunner.query(`
      CREATE TABLE timesheet_entries (
        id SERIAL PRIMARY KEY,
        timesheet_week_id INT NOT NULL,
        project_id INT NOT NULL,
        hours SMALLINT NOT NULL,
        created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT uk_timesheet_entries_week_project UNIQUE (timesheet_week_id, project_id),
        CONSTRAINT fk_timesheet_entries_week FOREIGN KEY (timesheet_week_id) REFERENCES timesheet_weeks (id)
          ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT fk_timesheet_entries_project FOREIGN KEY (project_id) REFERENCES projects (id)
          ON DELETE RESTRICT ON UPDATE CASCADE,
        CONSTRAINT chk_timesheet_entries_hours CHECK (hours >= 0)
      );
      CREATE INDEX idx_timesheet_entries_project_id ON timesheet_entries (project_id);
    `);

    await queryRunner.query(`
      CREATE TABLE activity_tags (
        id SERIAL PRIMARY KEY,
        name VARCHAR(128) NOT NULL,
        sort_order INT NOT NULL DEFAULT 0,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT uk_activity_tags_name UNIQUE (name)
      );
    `);

    await queryRunner.query(`
      CREATE TABLE timesheet_entry_tags (
        id SERIAL PRIMARY KEY,
        timesheet_entry_id INT NOT NULL,
        activity_tag_id INT NULL,
        other_text VARCHAR(128) NULL,
        created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_tet_entry FOREIGN KEY (timesheet_entry_id) REFERENCES timesheet_entries (id)
          ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT fk_tet_tag FOREIGN KEY (activity_tag_id) REFERENCES activity_tags (id)
          ON DELETE SET NULL ON UPDATE CASCADE,
        CONSTRAINT chk_tet_tag_or_text CHECK (
          activity_tag_id IS NOT NULL OR (other_text IS NOT NULL AND TRIM(other_text) <> '')
        )
      );
      CREATE INDEX idx_tet_entry_id ON timesheet_entry_tags (timesheet_entry_id);
      CREATE INDEX idx_tet_tag_id ON timesheet_entry_tags (activity_tag_id);
    `);

    await queryRunner.query(`
      CREATE TABLE system_config (
        config_key VARCHAR(64) PRIMARY KEY,
        config_value TEXT NOT NULL,
        updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await queryRunner.query(`
      CREATE TABLE refresh_tokens (
        id SERIAL PRIMARY KEY,
        user_id INT NOT NULL,
        token_hash VARCHAR(255) NOT NULL,
        expires_at TIMESTAMP(3) NOT NULL,
        created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT uk_refresh_tokens_hash UNIQUE (token_hash),
        CONSTRAINT fk_refresh_tokens_user FOREIGN KEY (user_id) REFERENCES users (id)
          ON DELETE CASCADE ON UPDATE CASCADE
      );
      CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens (user_id);
      CREATE INDEX idx_refresh_tokens_expires ON refresh_tokens (expires_at);
    `);

    await queryRunner.query(`
      CREATE TABLE password_setup_tokens (
        id SERIAL PRIMARY KEY,
        user_id INT NOT NULL,
        token_hash VARCHAR(255) NOT NULL,
        expires_at TIMESTAMP(3) NOT NULL,
        used_at TIMESTAMP(3) NULL,
        created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT uk_password_setup_tokens_hash UNIQUE (token_hash),
        CONSTRAINT fk_password_setup_tokens_user FOREIGN KEY (user_id) REFERENCES users (id)
          ON DELETE CASCADE ON UPDATE CASCADE
      );
      CREATE INDEX idx_password_setup_tokens_user_id ON password_setup_tokens (user_id);
      CREATE INDEX idx_password_setup_tokens_expires ON password_setup_tokens (expires_at);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const tables = [
      'password_setup_tokens',
      'refresh_tokens',
      'system_config',
      'timesheet_entry_tags',
      'activity_tags',
      'timesheet_entries',
      'timesheet_weeks',
      'allocations',
      'milestones',
      'projects',
      'resource_skills',
      'skills',
      'resources',
      'users',
    ];

    for (const table of tables) {
      await queryRunner.query(`DROP TABLE IF EXISTS ${table} CASCADE`);
    }

    const types = [
      'timesheet_week_status',
      'milestone_status',
      'project_health',
      'project_status',
      'proficiency',
      'skill_category',
      'resource_status',
      'account_status',
      'user_role',
    ];

    for (const type of types) {
      await queryRunner.query(`DROP TYPE IF EXISTS ${type}`);
    }
  }
}
