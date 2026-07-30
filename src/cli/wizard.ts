import { input, select, confirm } from "@inquirer/prompts";
import pc from "picocolors";
import { DBConfig, ColumnSchema } from "../core/types.js";
import { createDBAdapter } from "../core/factory.js";
import { getDialect } from "../core/dialect.js";

export async function runWizard(dbConfig: DBConfig) {
  let tableName = "";
  while (!tableName) {
    tableName = await input({
      message: "Enter the new table name:",
    });
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(tableName)) {
      console.log(
        pc.red(
          "Invalid table name. Use only letters, numbers, and underscores.",
        ),
      );
      tableName = "";
    }
  }

  const columns: ColumnSchema[] = [];
  let hasPk = false;
  let addMore = true;

  while (addMore) {
    printCurrentColumns(tableName, columns);
    let colName = "";
    while (!colName) {
      colName = await input({
        message: "Column name:",
      });
      if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(colName)) {
        console.log(
          pc.red(
            "Invalid column name. Use only letters, numbers, and underscores.",
          ),
        );
        colName = "";
      } else if (columns.find((c) => c.name === colName)) {
        console.log(pc.red("Column name already exists!"));
        colName = "";
      }
    }

    const colType = await select({
      message: `Select type for column '${colName}':`,
      choices: [
        { name: "Integer", value: "Integer" },
        { name: "Text (String)", value: "Text" },
        { name: "Boolean", value: "Boolean" },
        { name: "Decimal (Float)", value: "Decimal" },
        { name: "DateTime", value: "DateTime" },
      ],
    });

    let extra = "";

    if (colType === "DateTime") {
      const isTimestamp = await confirm({
        message: `Set default to CURRENT_TIMESTAMP?`,
        default: false,
      });
      if (isTimestamp) {
        extra = "Timestamp";
      }
    }

    let isPk = false;
    if (!hasPk && colType !== "DateTime") {
      isPk = await confirm({
        message: `Is '${colName}' the Primary Key?`,
        default: false,
      });
      if (isPk) {
        hasPk = true;
        if (colType === "Integer") extra = "AutoInc";
      }
    }

    let nullable = false;
    if (!isPk) {
      nullable = await confirm({
        message: `Can '${colName}' be NULL?`,
        default: true,
      });
    }

    columns.push({ name: colName, type: colType, isPk, nullable, extra });

    addMore = await confirm({
      theme: {
        prefix: pc.cyan("\n✔ "),
        style: {
          message: (text: string) => pc.bold(pc.white(text)),
          highlight: (text: string) => {
            const clean = text.replace(/\x1b\[[0-9;]*m/g, "");
            return pc.cyan(clean);
          },
        },
      },
      message: "Add another column?",
      default: true,
    });
  }

  printCurrentColumns(tableName, columns);
  console.log(pc.dim("Generating SQL..."));
  const dialect = getDialect(dbConfig.type as any);
  const sql = dialect.buildCreateTable(tableName, columns);

  console.log(pc.cyan("\n--- SQL Preview ---"));
  console.log(pc.yellow(sql));
  console.log(pc.cyan("-------------------\n"));

  const proceed = await confirm({
    message: "Do you want to execute this SQL to build the table?",
    default: true,
  });

  if (proceed) {
    const adapter = createDBAdapter(dbConfig as any);
    try {
      console.log(pc.dim("Executing SQL..."));
      await adapter.executeSql(sql);
      console.log(pc.green(`\n✅ Table '${tableName}' created successfully!`));
    } catch (e: any) {
      console.log(pc.red(`\n❌ Error creating table: ${e.message}`));
    } finally {
      await adapter.close();
    }
  } else {
    console.log(pc.yellow("Aborted table creation."));
  }

  await waitForEnter();
}

async function waitForEnter() {
  const { input } = await import("@inquirer/prompts");
  await input({
    message: "Press Enter to continue...",
  });
}

function printCurrentColumns(tableName: string, columns: ColumnSchema[]) {
  console.clear();
  console.log("\n");

  const colWidths = {
    name: 20,
    type: 18,
    pk: 8,
    nullable: 10,
    extra: 12,
  };

  const totalWidth =
    colWidths.name +
    colWidths.type +
    colWidths.pk +
    colWidths.nullable +
    colWidths.extra +
    14;

  // Title Box
  console.log(pc.cyan(`╔${"═".repeat(totalWidth)}╗`));
  const spacesNeeded = totalWidth - tableName.length;
  const leftSpace = Math.max(0, Math.floor(spacesNeeded / 2));
  const rightSpace = Math.max(0, spacesNeeded - leftSpace);
  const titleContent =
    " ".repeat(leftSpace) +
    pc.bold(pc.white(tableName)) +
    " ".repeat(rightSpace);
  console.log(pc.cyan("║") + titleContent + pc.cyan("║"));

  const drawDivider = (left: string, mid: string, right: string) => {
    return pc.cyan(
      left +
        "═".repeat(colWidths.name + 2) +
        mid +
        "═".repeat(colWidths.type + 2) +
        mid +
        "═".repeat(colWidths.pk + 2) +
        mid +
        "═".repeat(colWidths.nullable + 2) +
        mid +
        "═".repeat(colWidths.extra + 2) +
        right,
    );
  };

  console.log(drawDivider("╠", "╦", "╣"));

  // Header
  console.log(
    pc.cyan("║ ") +
      pc.bold(pc.white("Column Name".padEnd(colWidths.name))) +
      pc.cyan(" ║ ") +
      pc.bold(pc.white("Type".padEnd(colWidths.type))) +
      pc.cyan(" ║ ") +
      pc.bold(pc.white("PK".padEnd(colWidths.pk))) +
      pc.cyan(" ║ ") +
      pc.bold(pc.white("Nullable".padEnd(colWidths.nullable))) +
      pc.cyan(" ║ ") +
      pc.bold(pc.white("Extra".padEnd(colWidths.extra))) +
      pc.cyan(" ║"),
  );

  if (columns.length > 0) {
    console.log(drawDivider("╠", "╬", "╣"));
  }

  // Rows
  for (let i = 0; i < columns.length; i++) {
    const col = columns[i];

    // First pad the raw strings, then apply color
    const nameStr = pc.white(col.name.padEnd(colWidths.name));
    const typeStr = pc.white(col.type.padEnd(colWidths.type));

    const pkRaw = col.isPk ? "Yes" : "-";
    const pkStr = col.isPk
      ? pc.green(pkRaw.padEnd(colWidths.pk))
      : pc.dim(pkRaw.padEnd(colWidths.pk));

    const nullRaw = col.nullable ? "Yes" : "-";
    const nullStr = col.nullable
      ? pc.green(nullRaw.padEnd(colWidths.nullable))
      : pc.dim(nullRaw.padEnd(colWidths.nullable));

    const extraRaw = col.extra || "-";
    const extraStr = col.extra
      ? pc.yellow(extraRaw.padEnd(colWidths.extra))
      : pc.dim(extraRaw.padEnd(colWidths.extra));

    console.log(
      pc.cyan("║ ") +
        nameStr +
        pc.cyan(" ║ ") +
        typeStr +
        pc.cyan(" ║ ") +
        pkStr +
        pc.cyan(" ║ ") +
        nullStr +
        pc.cyan(" ║ ") +
        extraStr +
        pc.cyan(" ║"),
    );
  }

  if (columns.length === 0) {
    console.log(drawDivider("╠", "╩", "╣"));
    const emptyMsg = "No columns added yet";
    const emptyLeft = Math.max(
      0,
      Math.floor((totalWidth - emptyMsg.length) / 2),
    );
    const emptyRight = Math.max(0, totalWidth - emptyMsg.length - emptyLeft);
    console.log(
      pc.cyan("║") +
        " ".repeat(emptyLeft) +
        pc.dim(emptyMsg) +
        " ".repeat(emptyRight) +
        pc.cyan("║"),
    );
    console.log(pc.cyan(`╚${"═".repeat(totalWidth)}╝`));
  } else {
    console.log(drawDivider("╚", "╩", "╝"));
  }

  console.log("");
}
