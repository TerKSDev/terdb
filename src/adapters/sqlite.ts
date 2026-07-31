import type { DatabaseSync } from "node:sqlite";
import { DBAdapter, ColumnSchema } from "../core/types.js";

export class SqliteAdapter implements DBAdapter {
  private dbPath: string;
  private db: DatabaseSync | null = null;

  constructor(connection: string) {
    this.dbPath = connection;
  }

  private async getDb(): Promise<DatabaseSync> {
    if (!this.db) {
      const fs = await import("node:" + "fs");
      if (!fs.existsSync(this.dbPath)) {
        throw new Error(`Failed to found database file at: ${this.dbPath}`);
      }
      const sqlite = await import("node:" + "sqlite");
      this.db = new sqlite.DatabaseSync(this.dbPath);
    }
    return this.db!;
  }

  async getTables(): Promise<string[]> {
    const db = await this.getDb();
    const results = db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name;",
      )
      .all() as { name: string }[];
    return results.map((row) => row.name);
  }

  async getSchema(tableName: string): Promise<ColumnSchema[]> {
    const db = await this.getDb();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(tableName)) {
      throw new Error(`Invalid table name: ${tableName}`);
    }

    const pragmaQuery = db.prepare(`PRAGMA table_info("${tableName}")`);
    const info = pragmaQuery.all() as {
      cid: number;
      name: string;
      type: string;
      notnull: number;
      dflt_value: any;
      pk: number;
    }[];

    return info.map((col) => ({
      name: col.name,
      type: col.type,
      isPk: col.pk > 0,
      nullable: col.notnull === 0,
    }));
  }

  async getData(
    tableName: string,
    limit: number = 50,
    offset: number = 0,
    whereClause?: string
  ): Promise<{ columns: string[]; rows: Record<string, any>[] }> {
    const db = await this.getDb();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(tableName)) {
      throw new Error(`Invalid table name: ${tableName}`);
    }

    const schema = await this.getSchema(tableName);
    const columns = schema.map((col) => col.name);

    let sql = `SELECT * FROM "${tableName}"`;
    if (whereClause) {
      sql += ` WHERE ${whereClause}`;
    }
    sql += ` LIMIT ${limit} OFFSET ${offset}`;

    const dataQuery = db.prepare(sql);
    const rows = dataQuery.all() as Record<string, any>[];
    return { columns, rows };
  }

  async query(sql: string): Promise<{ columns: string[]; rows: Record<string, any>[] }> {
    const db = await this.getDb();
    const query = db.prepare(sql);
    // Node SQLite DatabaseSync only has `.all()` for fetching rows.
    // If it's a mutation (INSERT/UPDATE/DELETE), .all() will throw, so we should check.
    // However, the REPL might accept anything. Let's try .all(), fallback to .run()/.exec() if it fails?
    // Wait, `.all()` works for SELECT. If it's not a SELECT, we can use `.run()`.
    const isSelect = sql.trim().toUpperCase().startsWith("SELECT") || sql.trim().toUpperCase().startsWith("PRAGMA");
    if (isSelect) {
      const rows = query.all() as Record<string, any>[];
      let columns: string[] = [];
      if (rows.length > 0) {
        columns = Object.keys(rows[0]);
      } else {
        // We cannot reliably get columns from an empty result set in basic node:sqlite yet without PRAGMA or parsing.
      }
      return { columns, rows };
    } else {
      query.run();
      return { columns: ["Result"], rows: [{ Result: "Success" }] };
    }
  }

  async executeSql(sql: string): Promise<void> {
    const db = await this.getDb();
    db.exec(sql);
  }

  async close(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}
