import pc from "picocolors";
import { printLogo, printDashboard } from "./logo.js";
import { detectDatabase } from "../core/loader.js";
import { viewTables } from "./editor.js";
import { runWizard } from "./wizard.js";
import { runSetup } from "./setup.js";
import { runSqlWriter } from "./sqlWriter.js";
import { selectAction } from "./select/action.js";
import { selectBuild } from "./select/build.js";

export async function main() {
  let running = true;
  let dbConfig = await detectDatabase();

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
