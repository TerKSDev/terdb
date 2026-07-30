import { select, Separator } from "@inquirer/prompts";
import pc from "picocolors";
import { createDBAdapter } from "../core/factory.js";
import { selectTable } from "./select/table.js";
import { runBeginnerAdd, runBeginnerEdit, runBeginnerDelete, runExpertMode } from "./dataOps.js";

interface DBConfigProps {
  type: "sqlite" | "postgres" | "mysql" | "unknown";
  targetUrl: string;
  source: ".env" | "auto-detected" | "manual";
}

export async function viewTables(dbConfig: DBConfigProps) {
  const adapter = createDBAdapter(dbConfig as any);
  let viewing = true;

  while (viewing) {
    console.clear();

    let tables: string[] = [];
    let tablesCount = "Scanning...";
    try {
      tables = await adapter.getTables();
      tablesCount = `${tables.length} tables detected`;
    } catch (e: any) {
      tablesCount = `Error: ${e.message}`;
    }

    const terminalWidth = 74;
    const headerTitle = ` Database Editor  •  [${dbConfig.type.toUpperCase()}]`;
    const dashes = "═".repeat(terminalWidth - 2);
    console.log(pc.cyan(`\n╔${dashes}╗`));
    const spacesNeeded = terminalWidth - 2 - headerTitle.length;
    const leftSpace = Math.max(0, Math.floor(spacesNeeded / 2));
    const rightSpace = Math.max(0, spacesNeeded - leftSpace);
    const titleContent =
      " ".repeat(leftSpace) +
      pc.bold(pc.white(headerTitle)) +
      " ".repeat(rightSpace);
    console.log(pc.cyan("║") + titleContent + pc.cyan("║"));
    console.log(pc.cyan(`╠${"═".repeat(terminalWidth - 2)}╣`));

    const printLine = (label: string, value: string) => {
      const paddedLabel = label.padEnd(12);
      const lineContent = `  ${pc.bold(paddedLabel)}: ${value}`;
      const rawText =
        `  ${paddedLabel}: ` + value.replace(/\x1b\[[0-9;]*m/g, "");
      const padding = " ".repeat(
        Math.max(0, terminalWidth - 2 - rawText.length),
      );
      console.log(pc.cyan("║") + lineContent + padding + pc.cyan("║"));
    };

    const targetVal = dbConfig.targetUrl;
    const sourceVal =
      dbConfig.source === ".env"
        ? "Loaded from project .env file"
        : dbConfig.source === "auto-detected"
          ? "Auto-detected local SQLite file"
          : "Manual connection config";

    printLine("Database", dbConfig.type.toUpperCase());
    printLine(
      "Target",
      targetVal.length > 45 ? "..." + targetVal.slice(-42) : targetVal,
    );
    printLine("Source", sourceVal);
    printLine("Tables", tablesCount);

    console.log(pc.cyan(`╚${"═".repeat(terminalWidth - 2)}╝`));
    console.log(
      pc.dim(
        "      Use arrow keys to navigate • Enter to select • Ctrl+C to exit\n",
      ),
    );

    try {
      if (tables.length === 0) {
        console.log(pc.yellow("No tables found in this database."));
        await waitForEnter();
        await adapter.close();
        return;
      }

      const tableChoices = [
        ...tables.map((table) => ({
          name: table,
          value: table,
        })),
        new Separator(),
        {
          name: pc.dim("Go Back"),
          value: "BACK",
        },
      ];

      const selectedTable = await selectTable(tableChoices);

      if (selectedTable === "BACK") {
        viewing = false;
        continue;
      }

      let tableLoop = true;
      let currentPage = 1;
      const limit = 50;
      
      while (tableLoop) {
        const offset = (currentPage - 1) * limit;
        const schema = await adapter.getSchema(selectedTable);
        const colNames = schema.map(c => c.name);
        
        const data = await adapter.getData(selectedTable, limit, offset);
        const rows = data.rows;

        // 1. Calculate column widths with MAX_COL_WIDTH cap of 30 characters
        const MAX_COL_WIDTH = 30;
        const colWidths: Record<string, number> = {};
        let totalMinWidth = 0;
        for (const col of colNames) {
          let maxValLength = col.length;
          for (const row of rows) {
            const valStr = String((row as any)[col] ?? "");
            if (valStr.length > maxValLength) {
              maxValLength = valStr.length;
            }
          }
          const finalW = Math.max(
            col.length,
            Math.min(MAX_COL_WIDTH, maxValLength),
          );
          colWidths[col] = finalW;
          totalMinWidth += finalW;
        }

        // 2. Calculate dynamic terminalWidth (minimum 74 characters)
        const dividerWidths = 3 * (colNames.length - 1);
        const dynamicWidth = totalMinWidth + dividerWidths + 4;
        const currentTerminalWidth = Math.max(74, dynamicWidth);
        const availableTextWidth = currentTerminalWidth - 4 - dividerWidths;

        // Distribute remaining spaces to the last column
        if (totalMinWidth < availableTextWidth && colNames.length > 0) {
          const lastCol = colNames[colNames.length - 1];
          colWidths[lastCol] += availableTextWidth - totalMinWidth;
        }

        // Helper to truncate long cell values
        const truncate = (str: string, maxLen: number) => {
          if (str.length > maxLen) {
            return str.slice(0, maxLen - 3) + "...";
          }
          return str;
        };

        // 3. Draw outer Box Header with TableName (rows count)
        const detailHeaderTitle = ` ${selectedTable} (Page ${currentPage}) `;
        const detailDashes = "═".repeat(currentTerminalWidth - 2);
        console.log(pc.cyan(`\n╔${detailDashes}╗`));
        const detailSpacesNeeded =
          currentTerminalWidth - 2 - detailHeaderTitle.length;
        const detailLeftSpace = Math.max(0, Math.floor(detailSpacesNeeded / 2));
        const detailRightSpace = Math.max(
          0,
          detailSpacesNeeded - detailLeftSpace,
        );
        const detailTitleContent =
          " ".repeat(detailLeftSpace) +
          pc.bold(pc.white(detailHeaderTitle)) +
          " ".repeat(detailRightSpace);
        console.log(pc.cyan("║") + detailTitleContent + pc.cyan("║"));
        console.log(pc.cyan(`╠${"═".repeat(currentTerminalWidth - 2)}╣`));

        // 4. Draw Table Column Headers inside outer borders
        const headerRow = colNames
          .map((col) => pc.bold(pc.white(truncate(col, colWidths[col]).padEnd(colWidths[col]))))
          .join(pc.cyan(" ║ "));
        console.log(
          pc.cyan("║ ") + headerRow + pc.cyan(" ║"),
        );
        console.log(pc.cyan(`╠${"═".repeat(currentTerminalWidth - 2)}╣`));

        // 5. Draw Table Data Rows inside outer borders
        if (rows.length === 0) {
          const emptyMsg = "No records found";
          const emptySpaces = currentTerminalWidth - 4 - emptyMsg.length;
          const leftPad = Math.max(0, Math.floor(emptySpaces / 2));
          const rightPad = Math.max(0, emptySpaces - leftPad);
          console.log(
            pc.cyan("║ ") +
              " ".repeat(leftPad) +
              pc.yellow(emptyMsg) +
              " ".repeat(rightPad) +
              pc.cyan(" ║"),
          );
        } else {
          for (const row of rows) {
            const rowContent = colNames
              .map((col) =>
                pc.white(truncate(
                  String((row as any)[col] ?? ""),
                  colWidths[col],
                ).padEnd(colWidths[col])),
              )
              .join(pc.cyan(" ║ "));
            console.log(pc.cyan("║ ") + rowContent + pc.cyan(" ║"));
          }
        }

        console.log(pc.cyan(`╚${"═".repeat(currentTerminalWidth - 2)}╝`));
        console.log();

        const hasNextPage = rows.length === limit;
        const hasPrevPage = currentPage > 1;
        const actionChoices: any[] = [
          { name: "Add Data", value: "add" },
          { name: "Edit Data", value: "edit" },
          { name: "Delete Data", value: "delete" },
          new Separator(),
        ];
        if (hasPrevPage) actionChoices.push({ name: "Previous Page", value: "prev" });
        if (hasNextPage) actionChoices.push({ name: "Next Page", value: "next" });
        actionChoices.push({ name: pc.dim("Go Back"), value: "BACK" });

        const action = await select({
          message: "Select an action for this table:",
          theme: {
            prefix: pc.cyan("?"),
            icon: {
              cursor: pc.cyan("❯ "),
            },
            style: {
              message: (text: string) => pc.bold(pc.white(text)),
              highlight: (text: string) => {
                const clean = text.replace(/\x1b\[[0-9;]*m/g, "");
                return clean.includes("Go Back")
                  ? pc.red(clean)
                  : pc.cyan(clean);
              },
            },
          },
          choices: actionChoices,
        });

        if (action === "prev") {
          currentPage--;
          continue;
        }
        if (action === "next") {
          currentPage++;
          continue;
        }

        if (action === "BACK") {
          tableLoop = false;
          continue;
        }

        const mode = await select({
          message: `Select mode for ${action} data:`,
          choices: [
            { name: "Beginner (Interactive Step-by-Step)", value: "beginner" },
            { name: "Expert (Load SQL from .sql or .md file)", value: "expert" },
            new Separator(),
            { name: pc.dim("Cancel"), value: "cancel" },
          ]
        });

        if (mode === "cancel") {
          continue;
        }

        if (mode === "expert") {
          await runExpertMode(adapter);
          await waitForEnter();
          continue;
        }

        if (action === "add") {
          await runBeginnerAdd(adapter, dbConfig.type, selectedTable, schema);
          await waitForEnter();
        } else if (action === "edit") {
          await runBeginnerEdit(adapter, dbConfig.type, selectedTable, schema);
          await waitForEnter();
        } else if (action === "delete") {
          await runBeginnerDelete(adapter, dbConfig.type, selectedTable, schema);
          await waitForEnter();
        }
      }
    } catch (error: any) {
      console.log(pc.red(`\n❌ Error: ${error.message}`));
      await waitForEnter();
      viewing = false;
    }
  }

  await adapter.close();
}

async function waitForEnter() {
  const { input } = await import("@inquirer/prompts");
  await input({
    message: "Press Enter to continue...",
  });
}
