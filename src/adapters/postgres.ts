import { DBAdapter, ColumnSchema } from "../core/types.js";
import pg from "pg";

export class PostgresAdapter implements DBAdapter {
  private client: pg.Client;
  private connected: boolean = false;

  constructor(connection: string) {
    this.client = new pg.Client({
      connectionString: connection,
    });
  }

  private async connectIfNecessary() {
    if (!this.connected) {
      await this.client.connect();
      this.connected = true;
    }
  }

  async getTables(): Promise<string[]> {
    await this.connectIfNecessary();
    const query = `
      SELECT tablename 
      FROM pg_catalog.pg_tables 
      WHERE schemaname != 'pg_catalog' AND schemaname != 'information_schema'
      ORDER BY tablename;
    `;
    const res = await this.client.query(query);
    return res.rows.map((row) => row.tablename);
  }

  async getSchema(tableName: string): Promise<ColumnSchema[]> {
    await this.connectIfNecessary();
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(tableName)) {
      throw new Error(`Invalid table name: ${tableName}`);
    }

    const query = `
      SELECT c.column_name, c.data_type, c.is_nullable, 
             (SELECT count(*) 
              FROM information_schema.key_column_usage kcu 
              JOIN information_schema.table_constraints tc 
                ON kcu.constraint_name = tc.constraint_name 
              WHERE tc.constraint_type = 'PRIMARY KEY' 
                AND kcu.table_name = c.table_name 
                AND kcu.column_name = c.column_name) as is_pk
      FROM information_schema.columns c
      WHERE c.table_name = $1;
    `;
    const res = await this.client.query(query, [tableName]);
    
    return res.rows.map(col => ({
      name: col.column_name,
      type: col.data_type,
      isPk: parseInt(col.is_pk) > 0,
      nullable: col.is_nullable === "YES",
    }));
  }

  async getData(
    tableName: string,
    limit: number = 50,
    offset: number = 0,
    whereClause?: string
  ): Promise<{ columns: string[]; rows: Record<string, any>[] }> {
    await this.connectIfNecessary();
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(tableName)) {
      throw new Error(`Invalid table name: ${tableName}`);
    }

    const schema = await this.getSchema(tableName);
    const columns = schema.map((col) => col.name);

    let sql = `SELECT * FROM "${tableName}"`;
    if (whereClause) {
      sql += ` WHERE ${whereClause}`;
    }
    sql += ` LIMIT $1 OFFSET $2`;

    const res = await this.client.query(sql, [limit, offset]);
    return { columns, rows: res.rows };
  }

  async query(sql: string): Promise<{ columns: string[]; rows: Record<string, any>[] }> {
    await this.connectIfNecessary();
    const res = await this.client.query(sql);
    let columns: string[] = [];
    if (res.fields) {
      columns = res.fields.map(f => f.name);
    }
    return { columns, rows: res.rows || [] };
  }

  async executeSql(sql: string): Promise<void> {
    await this.connectIfNecessary();
    await this.client.query(sql);
  }

  async close(): Promise<void> {
    if (this.connected) {
      await this.client.end();
      this.connected = false;
    }
  }

  async insert(tableName: string, rows: Record<string, any>[]): Promise<void> {
    if (rows.length === 0) return;
    await this.connectIfNecessary();
    const cols = Object.keys(rows[0]);
    // Postgres placeholder format is $1, $2, $3 etc.
    // For batch inserts, we can build a long VALUES string or execute sequentially.
    // Executing sequentially is easier to write without dealing with complex $n indexing.
    for (const row of rows) {
      const placeholders = cols.map((_, i) => `$${i + 1}`).join(", ");
      const sql = `INSERT INTO "${tableName}" ("${cols.join('", "')}") VALUES (${placeholders})`;
      const values = cols.map(c => row[c]);
      await this.client.query(sql, values);
    }
  }
}
