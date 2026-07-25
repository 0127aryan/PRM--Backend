import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Env } from '../config/env.keys';
import { entities } from './entities';

@Injectable()
export class DatabaseService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly config: ConfigService,
  ) {}

  async getStatus() {
    const migrationsTable = this.config.getOrThrow<string>(
      Env.DB_MIGRATIONS_TABLE,
    );
    const tableNames = entities.map(
      (entity) => this.dataSource.getMetadata(entity).tableName,
    );

    let migrationsApplied = 0;
    let migrationsTableExists = false;

    try {
      const rows: Array<{ count: number | string }> =
        await this.dataSource.query(
          `SELECT COUNT(*) AS count FROM ${this.quoteIdentifier(migrationsTable)}`,
        );
      migrationsTableExists = true;
      migrationsApplied = Number(rows[0]?.count ?? 0);
    } catch {
      migrationsTableExists = false;
    }

    const existingTables: string[] = [];
    for (const name of tableNames) {
      try {
        await this.dataSource.query(
          `SELECT 1 FROM ${this.quoteIdentifier(name)} LIMIT 1`,
        );
        existingTables.push(name);
      } catch {
        // table missing
      }
    }

    return {
      database: this.config.get<string>(Env.DB_DATABASE) ?? 'from DATABASE_URL',
      driver: 'postgres',
      entityCount: tableNames.length,
      tablesFound: existingTables.length,
      tablesExpected: tableNames,
      tablesMissing: tableNames.filter((t) => !existingTables.includes(t)),
      migrations: {
        table: migrationsTable,
        tableExists: migrationsTableExists,
        appliedCount: migrationsApplied,
      },
    };
  }

  private quoteIdentifier(name: string): string {
    const escaped = name.replace(/"/g, '""');
    return `"${escaped}"`;
  }
}
