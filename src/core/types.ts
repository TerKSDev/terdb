export interface ColumnSchema {
  name: string;
  type: string;
  isPk: boolean;
  nullable: boolean;
  extra?: string;
}

export interface DBAdapter {
  getTables(): Promise<string[]>;
  getSchema(tableName: string): Promise<ColumnSchema[]>;
  getData(
    tableName: string,
    limit?: number,
    offset?: number,
    whereClause?: string
  ): Promise<{ columns: string[]; rows: Record<string, any>[] }>;
  query(sql: string): Promise<{ columns: string[]; rows: Record<string, any>[] }>;
  executeSql(sql: string): Promise<void>;
  close(): Promise<void>;
}

export interface DBConfig {
  type: "sqlite" | "postgres" | "mysql" | "unknown";
  targetUrl: string;
  source: ".env" | "auto-detected" | "manual";
}
