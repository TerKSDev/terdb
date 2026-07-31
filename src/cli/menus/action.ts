import { select, Separator } from "@inquirer/prompts";
import { DBConfig } from "../../core/types.js";
import pc from "picocolors";

export const selectAction = async (dbConfig: DBConfig) =>
  await select({
    message: "Select an action:",
    theme: {
      prefix: pc.cyan("✔ "),
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
        name: " Database Editor",
        value: "editor",
        description: "View, add, edit, delete data from the database.",
        disabled: dbConfig.type === "unknown",
      },
      {
        name: " Table Builder",
        value: "build",
        description:
          "Build database table(s) via interactive step-by-step wizard.",
        disabled: dbConfig.type === "unknown",
      },
      {
        name: " Interactive SQL REPL",
        value: "repl",
        description: "Execute arbitrary SQL queries interactively.",
        disabled: dbConfig.type === "unknown",
      },
      {
        name:
          dbConfig.type === "unknown"
            ? " Setup Connection"
            : " Re-configure Connection",
        value: dbConfig.type === "unknown" ? "setup" : "re-configure",
        description:
          dbConfig.type === "unknown"
            ? "Setup the database connection manually."
            : "Re-configure the database connection.",
      },
      new Separator(),
      {
        name: pc.dim(" Exit"),
        value: "exit",
        description: "Exit the TerDB CLI application.",
      },
    ],
  });
