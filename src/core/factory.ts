import { DBAdapter, DBConfig } from "./types.js";
import { SqliteAdapter } from "../adapters/sqlite.js";
import { PostgresAdapter } from "../adapters/postgres.js";
import { MysqlAdapter } from "../adapters/mysql.js";

export function createDBAdapter(config: DBConfig): DBAdapter {
  switch (config.type) {
    case "sqlite":
      return new SqliteAdapter(config.targetUrl);
    case "postgres":
      return new PostgresAdapter(config.targetUrl);
    case "mysql":
      return new MysqlAdapter(config.targetUrl);
    default:
      throw new Error(`Unsupported database type: ${config.type}`);
  }
}