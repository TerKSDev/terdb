import pc from "picocolors";
import { printLogo, printDashboard } from "./ui/logo.js";
import { detectDatabase } from "../core/loader.js";
import { viewTables } from "./views/editor.js";
import { runWizard } from "./wizards/buildTable.js";
import { runSetup } from "./wizards/setupConn.js";
import { runSqlWriter } from "./views/sqlWriter.js";
import { selectAction } from "./menus/action.js";
import { selectTableManager } from "./menus/tableManager.js";
import { runRepl } from "./views/repl.js";
import { parseArgs } from "node:util";

export async function main() {
  const args = process.argv.slice(2);
  let customUrl: string | undefined;

  // Handle URL shortcut if the first argument looks like a database connection string
  if (
    args.length > 0 &&
    (args[0].startsWith("postgres://") ||
      args[0].startsWith("postgresql://") ||
      args[0].startsWith("mysql://") ||
      args[0].startsWith("file:"))
  ) {
    customUrl = args[0];
  }

  const { positionals, values } = parseArgs({
    args,
    options: {
      format: { type: "string" },
      "schema-only": { type: "boolean" },
      table: { type: "string" },
      help: { type: "boolean" },
    },
    strict: false,
    allowPositionals: true,
  });

  if (values.help) {
    console.log(pc.cyan(`\nTerDB CLI - Modern Database Manager\n`));
    console.log(
      `${pc.bold("Usage:")} npx @terks.dev/terdb [command] [options]\n`,
    );
    console.log(`${pc.bold("Commands:")}`);
    console.log(`  ${pc.green("query")} "<sql>"         Run a quick SQL query`);
    console.log(
      `  ${pc.green("exec")} <file.sql>       Execute a SQL script file`,
    );
    console.log(
      `  ${pc.green("export")} [table]        Export table(s) to CSV/JSON`,
    );
    console.log(
      `  ${pc.green("import")} [file]         Import JSON/CSV into a table`,
    );
    console.log(
      `  ${pc.green("seed")} [table] [count]  Generate fake data for a table`,
    );
    console.log(
      `  ${pc.green("diagram")}               Generate a Mermaid ER diagram`,
    );
    console.log(
      `  ${pc.green("generate-types")}        Generate TypeScript interfaces`,
    );
    console.log(
      `  ${pc.green("backup")}                Backup the entire database`,
    );
    console.log(
      `  ${pc.green("studio")}                Launch the Web UI Studio`,
    );
    console.log(
      `  ${pc.green("init")} [db_type]        Initialize a local database & .env`,
    );
    console.log(`  ${pc.green("drop-db")} [db_type]     Drop a local database`);
    console.log(`\n${pc.bold("Options:")}`);
    console.log(`  --help                Show this help message`);
    console.log(`  --format <type>       Specify export format (csv|json)`);
    console.log(`  --schema-only         Export schema without data`);
    console.log(`  --table <name>        Specify table for import`);
    console.log(
      `\nIf you don't provide a command, TerDB will launch the Interactive UI!`,
    );
    process.exit(0);
  }

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

  if (command === "studio") {
    const { runStudio } = await import("../server/index.js");
    const dbConfig = await detectDatabase();
    await runStudio(dbConfig);
    return;
  }

  if (command === "backup") {
    const { runBackupCommand } = await import("../../subcommands/backup.js");
    const dbConfig = await detectDatabase();
    await runBackupCommand(dbConfig);
    return;
  }

  if (command === "import") {
    const { runImportCommand } = await import("../../subcommands/import.js");
    const dbConfig = await detectDatabase();
    await runImportCommand(dbConfig, positionals.slice(1), values as any);
    return;
  }

  if (command === "seed") {
    const { runSeedCommand } = await import("../../subcommands/seed.js");
    const dbConfig = await detectDatabase();
    await runSeedCommand(dbConfig, positionals.slice(1));
    return;
  }

  if (command === "diagram") {
    const { runDiagramCommand } = await import("../../subcommands/diagram.js");
    const dbConfig = await detectDatabase();
    await runDiagramCommand(dbConfig);
    return;
  }

  if (command === "exec") {
    const { runExecCommand } = await import("../../subcommands/exec.js");
    const dbConfig = await detectDatabase();
    await runExecCommand(dbConfig, positionals.slice(1));
    return;
  }

  if (command === "generate-types") {
    const { runGenerateTypesCommand } =
      await import("../../subcommands/generateTypes.js");
    const dbConfig = await detectDatabase();
    await runGenerateTypesCommand(dbConfig);
    return;
  }

  if (command === "init") {
    const { runInitCommand } = await import("../../subcommands/init.js");
    await runInitCommand(positionals.slice(1));
    return;
  }

  if (command === "drop-db") {
    const { runDropDbCommand } = await import("../../subcommands/drop.js");
    await runDropDbCommand(positionals.slice(1));
    return;
  }

  let running = true;
  let dbConfig = await detectDatabase(customUrl);

  while (running) {
    console.clear();
    printLogo();
    printDashboard(dbConfig);

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
      case "table":
        const { runTableManagerFlow } =
          await import("./wizards/tableManagerFlow.js");
        await runTableManagerFlow(dbConfig);
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
