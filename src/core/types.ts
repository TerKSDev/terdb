export interface DBAdapter {
  getTables(): Promise<string[]>;
  getData(
    tableName: string,
  ): Promise<{ columns: string[]; rows: Record<string, any>[] }>;
  close(): Promise<void>;
}
