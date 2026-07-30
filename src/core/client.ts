import fs from "node:fs";
import { DatabaseSync } from "node:sqlite";

export interface TableProps {
  [key: string]: any;
}

export async function getTable(dbPath: string) {
  if (!fs.existsSync(dbPath)) {
    throw new Error(`Failed to found database file at: ${dbPath}`);
  }

  // TODO: Add the real sqlite driver to get the table
  const db = new DatabaseSync(dbPath);
  try {
    const query = db.prepare(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name;",
    );
    const results = query.all() as { name: string }[];
    return results.map((row) => row.name);
  } finally {
    db.close();
  }
}

export async function getData(
  dbPath: string,
  tableName: string,
): Promise<{ columns: string[]; rows: TableProps[] }> {
  if (!fs.existsSync(dbPath)) {
    throw new Error(`Failed to found database file at: ${dbPath}`);
  }

  const db = new DatabaseSync(dbPath);
  try {
    if (!/^[\[A-Za-z_][A-Za-z0-9_]*$/.test(tableName)) {
      throw new Error(`Invalid table name: ${tableName}`);
    }

    const pragmaQuery = db.prepare(`PRAGMA table_info("${tableName}")`);
    const info = pragmaQuery.all() as { name: string }[];
    const columns = info.map((item) => item.name);

    const dataQuery = db.prepare(`SELECT * FROM "${tableName}" LIMIT 50`);
    const rows = dataQuery.all() as TableProps[];
    return { columns, rows };
  } finally {
    db.close();
  }
}
