import { select, confirm, input } from "@inquirer/prompts";
import pc from "picocolors";
import { DBConfig } from "../../core/types.js";
import { createDBAdapter } from "../../core/factory.js";
import { getDialect } from "../../core/dialect.js";
import { promptColumnSchema } from "./columnWizard.js";

export async function runDropTable(dbConfig: DBConfig) {
  const adapter = createDBAdapter(dbConfig as any);
  try {
    const tables = await adapter.getTables();
    if (tables.length === 0) {
      console.log(pc.yellow("No tables found in the database."));
      return;
    }
    const targetTable = await select({
      message: "Select a table to drop:",
      choices: tables.map((t) => ({ name: t, value: t })),
    });

    const sure = await confirm({
      message: `Are you sure you want to DROP TABLE '${targetTable}'? This will delete all its data!`,
      default: false,
    });

    if (sure) {
      let sql = `DROP TABLE ${targetTable}`;
      if (dbConfig.type === "sqlite" || dbConfig.type === "postgres") {
        sql = `DROP TABLE "${targetTable}"`;
      } else if (dbConfig.type === "mysql") {
        sql = `DROP TABLE \`${targetTable}\``;
      }
      await adapter.executeSql(sql);
      console.log(pc.green(`✓ Table '${targetTable}' dropped successfully.`));
    }
  } catch (e: any) {
    console.log(pc.red(`Error: ${e.message}`));
  } finally {
    await adapter.close();
  }
}

export async function runModifyTable(
  dbConfig: DBConfig,
  action: "add" | "rename" | "modify" | "delete",
) {
  const adapter = createDBAdapter(dbConfig as any);
  const dialect = getDialect(dbConfig.type as any);

  try {
    const tables = await adapter.getTables();
    if (tables.length === 0) {
      console.log(pc.yellow("No tables found in the database."));
      return;
    }
    const targetTable = await select({
      message: "Select a table to modify:",
      choices: tables.map((t) => ({ name: t, value: t })),
    });

    const schema = await adapter.getSchema(targetTable);

    if (action === "add") {
      const hasPk = schema.some((c) => c.isPk);
      const existingColumns = schema.map(c => c.name);
      const { col } = await promptColumnSchema(adapter, hasPk, existingColumns);
      if (col) {
        const colSql = dialect.buildCreateTable("tmp", [col])
          .split("\n")[1]
          .trim()
          .replace(/,$/, ""); // Extract just the column definition part
        
        let sql = `ALTER TABLE ${targetTable} ADD COLUMN ${colSql}`;
        if (dbConfig.type === "sqlite" || dbConfig.type === "postgres") {
          sql = `ALTER TABLE "${targetTable}" ADD COLUMN ${colSql}`;
        } else if (dbConfig.type === "mysql") {
          sql = `ALTER TABLE \`${targetTable}\` ADD COLUMN ${colSql}`;
        }

        await adapter.executeSql(sql);
        console.log(pc.green(`✓ Column '${col.name}' added successfully.`));
      }
    } else if (action === "rename") {
      if (schema.length === 0) return console.log(pc.yellow("Table has no columns."));
      const oldCol = await select({
        message: "Select a column to rename:",
        choices: schema.map((c) => ({ name: `${c.name} (${c.type})`, value: c.name })),
      });
      const newCol = await input({ message: `New name for '${oldCol}':` });
      if (newCol && newCol !== oldCol) {
        let sql = `ALTER TABLE ${targetTable} RENAME COLUMN ${oldCol} TO ${newCol}`;
        if (dbConfig.type === "sqlite" || dbConfig.type === "postgres") {
          sql = `ALTER TABLE "${targetTable}" RENAME COLUMN "${oldCol}" TO "${newCol}"`;
        } else if (dbConfig.type === "mysql") {
          sql = `ALTER TABLE \`${targetTable}\` RENAME COLUMN \`${oldCol}\` TO \`${newCol}\``;
        }
        await adapter.executeSql(sql);
        console.log(pc.green(`✓ Column renamed to '${newCol}' successfully.`));
      }
    } else if (action === "modify") {
      if (schema.length === 0) return console.log(pc.yellow("Table has no columns."));
      if (dbConfig.type === "sqlite") {
        console.log(pc.yellow("SQLite does not support altering column types directly. Please recreate the table."));
        return;
      }
      const targetCol = await select({
        message: "Select a column to modify:",
        choices: schema.map((c) => ({ name: `${c.name} (${c.type})`, value: c.name })),
      });
      
      const hasPk = schema.some((c) => c.isPk && c.name !== targetCol);
      const existingColumns = schema.map(c => c.name).filter(n => n !== targetCol);
      const { col } = await promptColumnSchema(adapter, hasPk, existingColumns, targetCol);
      
      if (col) {
        const colDef = dialect.buildCreateTable("tmp", [col])
          .split("\n")[1]
          .trim()
          .replace(/,$/, "");
          
        let sql = "";
        if (dbConfig.type === "postgres") {
          // Postgres ALTER COLUMN syntax is complex, simplified version:
          // We will extract just the type and defaults. This is a best-effort approach.
          console.log(pc.yellow("Note: Complex constraint modifications might require raw SQL in Postgres."));
          sql = `ALTER TABLE "${targetTable}" ALTER COLUMN ${colDef.replace(col.name, `"${col.name}" TYPE`)}`;
        } else if (dbConfig.type === "mysql") {
          sql = `ALTER TABLE \`${targetTable}\` MODIFY COLUMN ${colDef}`;
        }

        try {
          await adapter.executeSql(sql);
          console.log(pc.green(`✓ Column '${targetCol}' modified successfully.`));
        } catch (e: any) {
          console.log(pc.red(`x Could not modify column automatically. Try using Raw SQL.`));
          console.log(pc.dim(e.message));
        }
      }
    } else if (action === "delete") {
      if (schema.length === 0) return console.log(pc.yellow("Table has no columns."));
      const targetCol = await select({
        message: "Select a column to delete:",
        choices: schema.map((c) => ({ name: `${c.name} (${c.type})`, value: c.name })),
      });

      const sure = await confirm({
        message: `Are you sure you want to delete column '${targetCol}'? Data will be lost!`,
        default: false,
      });

      if (sure) {
        let sql = `ALTER TABLE ${targetTable} DROP COLUMN ${targetCol}`;
        if (dbConfig.type === "sqlite" || dbConfig.type === "postgres") {
          sql = `ALTER TABLE "${targetTable}" DROP COLUMN "${targetCol}"`;
        } else if (dbConfig.type === "mysql") {
          sql = `ALTER TABLE \`${targetTable}\` DROP COLUMN \`${targetCol}\``;
        }

        try {
          await adapter.executeSql(sql);
          console.log(pc.green(`✓ Column '${targetCol}' deleted successfully.`));
        } catch (e: any) {
          console.log(pc.red(`x Error deleting column: ${e.message}`));
        }
      }
    }
  } catch (e: any) {
    console.log(pc.red(`Error: ${e.message}`));
  } finally {
    await adapter.close();
  }
}
