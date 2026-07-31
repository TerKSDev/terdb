import pc from "picocolors";
import { DBConfig, ColumnSchema } from "../src/core/types.js";
import { createDBAdapter } from "../src/core/factory.js";

// Basic seeders without external dependencies
function generateRandomString(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) result += chars.charAt(Math.floor(Math.random() * chars.length));
  return result;
}

function generateRandomEmail(): string {
  const domains = ['gmail.com', 'yahoo.com', 'outlook.com', 'example.com'];
  const name = generateRandomString(8).toLowerCase();
  const domain = domains[Math.floor(Math.random() * domains.length)];
  return `${name}@${domain}`;
}

function generateFakeData(col: ColumnSchema): any {
  // 1. Name-based heuristics
  const name = col.name.toLowerCase();
  if (name.includes("email")) return generateRandomEmail();
  if (name.includes("phone")) return `+1${Math.floor(Math.random() * 9000000000 + 1000000000)}`;
  if (name.includes("name")) return `User_${generateRandomString(5)}`;
  if (name.includes("url") || name.includes("link")) return `https://example.com/${generateRandomString(6)}`;
  if (name.includes("date") || name.includes("time") || name.includes("created") || name.includes("updated")) {
    const d = new Date(Date.now() - Math.floor(Math.random() * 10000000000));
    return d.toISOString().replace('T', ' ').slice(0, 19);
  }
  
  // 2. Type-based fallbacks (for unusual names)
  const type = col.type.toLowerCase();
  if (type.includes("int") || type.includes("num") || type.includes("float") || type.includes("double")) {
    return Math.floor(Math.random() * 1000);
  }
  if (type.includes("bool") || type === "tinyint(1)") {
    return Math.random() > 0.5;
  }
  if (type.includes("char") || type.includes("text") || type.includes("string")) {
    return generateRandomString(10);
  }
  
  // Default fallback
  return generateRandomString(5);
}

export async function runSeedCommand(dbConfig: DBConfig, args: string[]) {
  if (dbConfig.type === "unknown") {
    console.log(pc.red("Error: No database connection found. Cannot run seed."));
    process.exit(1);
  }

  const adapter = createDBAdapter(dbConfig);
  let tableName = args[0];
  let countStr = args[1];

  const { input, select } = await import("@inquirer/prompts");

  if (!tableName) {
    const allTables = await adapter.getTables();
    if (allTables.length === 0) {
      console.log(pc.yellow("No tables found. Please create a table first."));
      process.exit(1);
    }
    tableName = await select({
      message: "Which table do you want to seed with fake data?",
      choices: allTables.map(t => ({ name: t, value: t }))
    });
  }

  let count = parseInt(countStr);
  if (isNaN(count) || count <= 0) {
    const res = await input({ message: "How many rows to generate?", default: "50" });
    count = parseInt(res);
    if (isNaN(count) || count <= 0) {
      console.log(pc.red("Error: Invalid count number."));
      process.exit(1);
    }
  }

  console.log(pc.cyan(`\nAnalyzing schema for table '${tableName}'...`));
  let schema;
  try {
    schema = await adapter.getSchema(tableName);
  } catch (e: any) {
    console.log(pc.red(`Error: ${e.message}`));
    process.exit(1);
  }

  // Filter out Primary Keys to let DB auto-increment (unless UUID which is harder to detect, we assume auto-inc for now)
  const targetCols = schema.filter(c => !c.isPk);
  
  if (targetCols.length === 0) {
    console.log(pc.yellow("Table only has Primary Key columns. Seeding might fail if they don't auto-increment."));
  }

  console.log(pc.cyan(`Generating ${count} records...`));
  const rowsToInsert = [];
  
  for (let i = 0; i < count; i++) {
    const row: Record<string, any> = {};
    for (const col of (targetCols.length > 0 ? targetCols : schema)) {
      row[col.name] = generateFakeData(col);
    }
    rowsToInsert.push(row);
  }

  const CHUNK_SIZE = 500;
  let inserted = 0;
  
  try {
    // Disable Foreign Key checks before seeding to allow dummy data
    if (dbConfig.type === "sqlite") await adapter.executeSql("PRAGMA foreign_keys = OFF;");
    else if (dbConfig.type === "mysql") await adapter.executeSql("SET FOREIGN_KEY_CHECKS = 0;");
    else if (dbConfig.type === "postgres") await adapter.executeSql("SET session_replication_role = replica;");

    for (let i = 0; i < rowsToInsert.length; i += CHUNK_SIZE) {
      const chunk = rowsToInsert.slice(i, i + CHUNK_SIZE);
      await adapter.insert(tableName, chunk);
      inserted += chunk.length;
      process.stdout.write(`\r${pc.dim(`Progress: ${inserted} / ${count}`)}`);
    }
    console.log(pc.green(`\n\n✔ Successfully seeded ${inserted} fake records into ${tableName}!`));
  } catch (e: any) {
    console.log(pc.red(`\n✘ Seed failed: ${e.message}`));
  } finally {
    // Re-enable Foreign Key checks
    try {
      if (dbConfig.type === "sqlite") await adapter.executeSql("PRAGMA foreign_keys = ON;");
      else if (dbConfig.type === "mysql") await adapter.executeSql("SET FOREIGN_KEY_CHECKS = 1;");
      else if (dbConfig.type === "postgres") await adapter.executeSql("SET session_replication_role = DEFAULT;");
    } catch (e) {
      // Ignore errors on cleanup
    }
    await adapter.close();
  }
  
  process.exit(0);
}
