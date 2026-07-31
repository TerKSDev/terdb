import { select, Separator } from "@inquirer/prompts";
import pc from "picocolors";

export const selectBuild = async () =>
  await select({
    message: "What method you want to use to build database table(s)?",
    theme: {
      prefix: pc.cyan("✔ "),
      icon: {
        cursor: pc.cyan("❯ "),
      },
      style: {
        message: (text: string) => pc.bold(pc.white(text)),
        highlight: (text: string) => {
          const clean = text.replace(/\x1b\[[0-9;]*m/g, "");
          return clean.includes("Go Back") ? pc.red(clean) : pc.cyan(clean);
        },
      },
    },
    choices: [
      {
        name: "Wizard (Suitable for Beginners)",
        value: "wizard",
        description:
          "Build database table(s) via interactive step-by-step wizard.",
      },
      {
        name: "SQL Writer (Suitable for Experts)",
        value: "sql",
        description:
          "Manually write SQL statement(s) to build database table(s).",
      },
      new Separator(),
      {
        name: pc.dim("Go Back"),
        value: "back",
        description: "Back to the main menu.",
      },
    ],
  });
