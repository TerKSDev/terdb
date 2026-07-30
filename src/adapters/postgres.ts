import { DBAdapter } from "../core/types.js";
import { Client } from "pg";

export class PostgresAdapter implements DBAdapter {
  private connection: string;

  constructor(connection: string) {
    this.connection = connection;
  }

  async getTables(): Promise<string[]> {
    return ["pg_users", "orders"];
  }

  async getData(tableName: string) {
    return {
      columns: ["id", "total"],
      row: [],
    };
  }

  async close() {
    
  }
}
