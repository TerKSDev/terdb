import pc from "picocolors";
import { DBConfig } from "../src/core/types.js";
import { createDBAdapter } from "../src/core/factory.js";
import fs from "fs/promises";
import path from "path";

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter(line => line.trim() !== "");
  if (lines.length === 0) return [];
  
  const parseLine = (line: string) => {
    const result = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"' && line[i + 1] === '"') {
        current += '"';
        i++; // skip escaped quote
      } else if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = "";
      } else {
        current += char;
      }
    }
    result.push(current);
    return result;
  };
  
  const headers = parseLine(lines[0]);
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseLine(lines[i]);
    const row: Record<string, string> = {};
    headers.forEach((h, index) => {
      row[h] = values[index] ?? "";
    });
    rows.push(row);
  }
  return rows;
}

export async function runImportCommand(dbConfig: DBConfig, args: string[], options: Record<string, string | boolean>) {
  if (dbConfig.type === "unknown") {
    console.log(pc.red("Error: No database connection found. Cannot run import."));
    process.exit(1);
  }

  const adapter = createDBAdapter(dbConfig);
  let filePath = args[0];
  let tableName = options.table as string;

  const { input, select } = await import("@inquirer/prompts");

  if (!filePath) {
    filePath = await input({ message: "Enter the path to your CSV or JSON file:" });
  }

  const resolvedPath = path.resolve(process.cwd(), filePath);
  
  try {
    await fs.access(resolvedPath);
  } catch {
    console.log(pc.red(`Error: File not found at ${resolvedPath}`));
    process.exit(1);
  }

  if (!tableName) {
    const allTables = await adapter.getTables();
    if (allTables.length === 0) {
      console.log(pc.yellow("No tables found. Please create a table first."));
      process.exit(1);
    }
    tableName = await select({
      message: "Which table do you want to import data into?",
      choices: allTables.map(t => ({ name: t, value: t }))
    });
  }

  console.log(pc.cyan(`\nReading file...`));
  const fileContent = await fs.readFile(resolvedPath, "utf-8");
  let rowsToInsert: Record<string, any>[] = [];

  if (filePath.toLowerCase().endsWith(".json")) {
    try {
      rowsToInsert = JSON.parse(fileContent);
      if (!Array.isArray(rowsToInsert)) {
        throw new Error("JSON root must be an array of objects.");
      }
    } catch (e: any) {
      console.log(pc.red(`Invalid JSON format: ${e.message}`));
      process.exit(1);
    }
  } else if (filePath.toLowerCase().endsWith(".csv")) {
    rowsToInsert = parseCSV(fileContent);
  } else {
    console.log(pc.red("Error: Unsupported file extension. Please provide a .csv or .json file."));
    process.exit(1);
  }

  if (rowsToInsert.length === 0) {
    console.log(pc.yellow("No data found to import."));
    process.exit(0);
  }

  console.log(pc.cyan(`Importing ${rowsToInsert.length} rows into '${tableName}'...`));
  
  // Chunking to prevent massive memory spikes or query too large errors
  const CHUNK_SIZE = 500;
  let inserted = 0;
  
  try {
    for (let i = 0; i < rowsToInsert.length; i += CHUNK_SIZE) {
      const chunk = rowsToInsert.slice(i, i + CHUNK_SIZE);
      await adapter.insert(tableName, chunk);
      inserted += chunk.length;
      process.stdout.write(`\r${pc.dim(`Progress: ${inserted} / ${rowsToInsert.length}`)}`);
    }
    console.log(pc.green(`\n\n✔ Successfully imported ${inserted} rows into ${tableName}!`));
  } catch (e: any) {
    console.log(pc.red(`\n✘ Import failed at row ${inserted}: ${e.message}`));
  } finally {
    await adapter.close();
  }
  
  process.exit(0);
}
