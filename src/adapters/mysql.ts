import { DBAdapter, ColumnSchema } from "../core/types.js";
import mysql from "mysql2/promise";

export class MysqlAdapter implements DBAdapter {
  private connection: string;
  private pool: mysql.Pool | null = null;

  constructor(connection: string) {
    this.connection = connection;
  }

  private async getPool() {
    if (!this.pool) {
      this.pool = mysql.createPool(this.connection);
    }
    return this.pool;
  }

  async getTables(): Promise<string[]> {
    const pool = await this.getPool();
    const [rows] = await pool.query("SHOW TABLES;");
    // SHOW TABLES returns objects where the key is like "Tables_in_dbname"
    // Extract the first value of each row object
    return (rows as any[]).map((row) => Object.values(row)[0] as string);
  }

  async getSchema(tableName: string): Promise<ColumnSchema[]> {
    const pool = await this.getPool();
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(tableName)) {
      throw new Error(`Invalid table name: ${tableName}`);
    }

    const [rows] = await pool.query(`SHOW COLUMNS FROM \`${tableName}\``);
    const columns = rows as any[];
    
    return columns.map((col) => ({
      name: col.Field,
      type: col.Type,
      isPk: col.Key === "PRI",
      nullable: col.Null === "YES",
      extra: col.Extra,
    }));
  }

  async getData(
    tableName: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<{ columns: string[]; rows: Record<string, any>[] }> {
    const pool = await this.getPool();
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(tableName)) {
      throw new Error(`Invalid table name: ${tableName}`);
    }

    const schema = await this.getSchema(tableName);
    const columns = schema.map((col) => col.name);

    const [rows] = await pool.query(`SELECT * FROM \`${tableName}\` LIMIT ${limit} OFFSET ${offset}`);
    return { columns, rows: rows as Record<string, any>[] };
  }

  async executeSql(sql: string): Promise<void> {
    const pool = await this.getPool();
    await pool.query(sql);
  }

  async close(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
    }
  }
}
