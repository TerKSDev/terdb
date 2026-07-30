import { select, Separator } from "@inquirer/prompts";
import pc from "picocolors";
import { printLogo, printDashboard } from "./logo.js";
import { detectDatabase } from "../core/loader.js";
import { viewTables } from "./viewer.js";

export async function main() {
  let running = true;
  const dbConfig = await detectDatabase();

  while (running) {
    console.clear();
    printLogo();
    printDashboard(dbConfig);
    console.log(
      pc.dim(
        "      Use arrow keys to navigate • Enter to select • Ctrl+C to exit\n",
      ),
    );

    const choice = await select({
      message: "Please select an action:",
      theme: {
        prefix: pc.cyan("?"),
        icon: {
          cursor: pc.cyan("❯ "),
        },
        style: {
          message: (text: string) => pc.bold(pc.white(text)),
          highlight: (text: string) => {
            const clean = text.replace(/\x1b\[[0-9;]*m/g, "");
            return clean.includes("Exit") ? pc.red(clean) : pc.cyan(clean);
          },
        },
      },
      choices: [
        {
          name: "Database Editor",
          value: "editor",
          description: "View, add, edit, delete data from the database.",
        },
        {
          name: "Table Builder",
          value: "create",
          description:
            "Create a new database table via interactive step-by-step wizard.",
        },
        {
          name: "Check Connection",
          value: "check",
          description:
            "Scan local directories and .env files for database configurations.",
        },
        new Separator(),
        {
          name: pc.dim("Exit"),
          value: "exit",
          description: "Exit the TerDB CLI application.",
        },
      ],
    });

    switch (choice) {
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
      case "create":
        console.log(pc.yellow("\n[建立資料表] 功能開發中... (按 Enter 繼續)"));
        await waitForEnter();
        break;
      case "check":
        console.log(pc.green("\n正在掃描當前目錄的 .env 檔案..."));
        await waitForEnter();
        break;
      case "exit":
        running = false;
        console.log(pc.dim("\n感謝使用 terdb，再見！"));
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
