import { ColumnSchema } from "./types.js";

export interface Dialect {
  quoteIdentifier(name: string): string;
  escapeString(val: string): string;
  buildCreateTable(tableName: string, columns: ColumnSchema[]): string;
}

export class SqliteDialect implements Dialect {
  quoteIdentifier(name: string): string {
    return `"${name}"`;
  }
  
  escapeString(val: string): string {
    return val.replace(/'/g, "''");
  }

  buildCreateTable(tableName: string, columns: ColumnSchema[]): string {
    const lines = columns.map(col => {
      let typeStr = "";
      if (col.type === "Integer") typeStr = "INTEGER";
      if (col.type === "Text") typeStr = "TEXT";
      if (col.type === "Boolean") typeStr = "BOOLEAN";
      if (col.type === "Decimal") typeStr = "REAL";
      if (col.type === "DateTime") typeStr = "DATETIME";
      
      if (col.isPk && col.type === "Integer") typeStr = "INTEGER PRIMARY KEY AUTOINCREMENT";
      else if (col.isPk) typeStr += " PRIMARY KEY";
      else {
        if (!col.nullable) typeStr += " NOT NULL";
      }
      
      if (col.extra === "Timestamp") typeStr += " DEFAULT CURRENT_TIMESTAMP";
      
      return `  ${this.quoteIdentifier(col.name)} ${typeStr}`;
    });

    return `CREATE TABLE ${this.quoteIdentifier(tableName)} (\n${lines.join(",\n")}\n);`;
  }
}

export class PostgresDialect implements Dialect {
  quoteIdentifier(name: string): string {
    return `"${name}"`;
  }

  escapeString(val: string): string {
    return val.replace(/'/g, "''");
  }

  buildCreateTable(tableName: string, columns: ColumnSchema[]): string {
    const lines = columns.map(col => {
      let typeStr = "";
      if (col.isPk && col.type === "Integer") typeStr = "SERIAL PRIMARY KEY";
      else {
        if (col.type === "Integer") typeStr = "INTEGER";
        if (col.type === "Text") typeStr = "TEXT";
        if (col.type === "Boolean") typeStr = "BOOLEAN";
        if (col.type === "Decimal") typeStr = "NUMERIC";
        if (col.type === "DateTime") typeStr = "TIMESTAMP";
        
        if (col.isPk) typeStr += " PRIMARY KEY";
        if (!col.nullable && !col.isPk) typeStr += " NOT NULL";
      }
      
      if (col.extra === "Timestamp") typeStr += " DEFAULT CURRENT_TIMESTAMP";
      
      return `  ${this.quoteIdentifier(col.name)} ${typeStr}`;
    });

    return `CREATE TABLE ${this.quoteIdentifier(tableName)} (\n${lines.join(",\n")}\n);`;
  }
}

export class MysqlDialect implements Dialect {
  quoteIdentifier(name: string): string {
    return `\`${name}\``;
  }

  escapeString(val: string): string {
    return val.replace(/'/g, "''");
  }

  buildCreateTable(tableName: string, columns: ColumnSchema[]): string {
    const lines = columns.map(col => {
      let typeStr = "";
      if (col.type === "Integer") typeStr = "INT";
      if (col.type === "Text") typeStr = "VARCHAR(255)";
      if (col.type === "Boolean") typeStr = "BOOLEAN";
      if (col.type === "Decimal") typeStr = "DOUBLE";
      if (col.type === "DateTime") typeStr = "DATETIME";
      
      if (col.isPk && col.type === "Integer") typeStr += " AUTO_INCREMENT PRIMARY KEY";
      else if (col.isPk) typeStr += " PRIMARY KEY";
      
      if (!col.nullable && !col.isPk) typeStr += " NOT NULL";
      if (col.extra === "Timestamp") typeStr += " DEFAULT CURRENT_TIMESTAMP";
      
      return `  ${this.quoteIdentifier(col.name)} ${typeStr}`;
    });

    return `CREATE TABLE ${this.quoteIdentifier(tableName)} (\n${lines.join(",\n")}\n);`;
  }
}

export function getDialect(type: "sqlite" | "postgres" | "mysql" | "unknown"): Dialect {
  switch (type) {
    case "sqlite": return new SqliteDialect();
    case "postgres": return new PostgresDialect();
    case "mysql": return new MysqlDialect();
    default: return new SqliteDialect();
  }
}
