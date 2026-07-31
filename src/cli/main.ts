import pc from "picocolors";
import { printLogo, printDashboard } from "./ui/logo.js";
import { detectDatabase } from "../core/loader.js";
import { viewTables } from "./views/editor.js";
import { runWizard } from "./wizards/buildTable.js";
import { runSetup } from "./wizards/setup.js";
import { runSqlWriter } from "./views/sqlWriter.js";
import { selectAction } from "./menus/action.js";
import { selectBuild } from "./menus/build.js";
import { runRepl } from "./views/repl.js";
import { parseArgs } from "node:util";

export async function main() {
  const args = process.argv.slice(2);
  let customUrl: string | undefined;

  // Handle URL shortcut if the first argument looks like a database connection string
  if (args.length > 0 && (args[0].startsWith("postgres://") || args[0].startsWith("postgresql://") || args[0].startsWith("mysql://") || args[0].startsWith("file:"))) {
    customUrl = args[0];
  }

  const { positionals, values } = parseArgs({
    args,
    options: {
      format: { type: "string" },
      "schema-only": { type: "boolean" }
    },
    strict: false,
    allowPositionals: true
  });

  const command = customUrl ? undefined : positionals[0];

  if (command === "query") {
    const { runQueryCommand } = await import("../../subcommands/query.js");
    const dbConfig = await detectDatabase();
    await runQueryCommand(dbConfig, positionals.slice(1));
    return;
  }

  if (command === "export") {
    const { runExportCommand } = await import("../../subcommands/export.js");
    const dbConfig = await detectDatabase();
    await runExportCommand(dbConfig, positionals.slice(1), values as any);
    return;
  }

  if (command === "backup") {
    const { runBackupCommand } = await import("../../subcommands/backup.js");
    const dbConfig = await detectDatabase();
    await runBackupCommand(dbConfig);
    return;
  }

  let running = true;
  let dbConfig = await detectDatabase(customUrl);

  while (running) {
    console.clear();
    printLogo();
    printDashboard(dbConfig);
    console.log(
      pc.dim(
        "      Use arrow keys to navigate • Enter to select • Ctrl+C to exit\n",
      ),
    );

    const action = await selectAction(dbConfig);

    switch (action) {
      case "editor":
        if (dbConfig.type === "unknown") {
          console.log(
            pc.yellow(
              `\nNo database connection found. Please run ${pc.bold("terdb check")} first.`,
            ),
          );
          await waitForEnter();
        } else {
          await viewTables(dbConfig);
        }
        break;
      case "build":
        const buildMethod = await selectBuild(dbConfig);
        switch (buildMethod) {
          case "wizard":
            if (dbConfig.type === "unknown") {
              console.log(
                pc.yellow(
                  `\nNo database connection found. Please setup first.`,
                ),
              );
            } else {
              await runWizard(dbConfig);
            }
            break;
          case "sql":
            await runSqlWriter(dbConfig);
            break;
          case "back":
            break;
        }
        break;
      case "repl":
        await runRepl(dbConfig);
        break;
      case "setup":
      case "re-configure":
        dbConfig = await runSetup(dbConfig);
        await waitForEnter();
        break;
      case "exit":
        running = false;
        console.log(pc.dim("\nThanks for using TerDB. Goodbye!"));
        break;
    }
  }

  async function waitForEnter() {
    const { input } = await import("@inquirer/prompts");
    await input({
      message: "Click Enter to continue...",
    });
  }
}
