import pc from "picocolors";

export interface DBConfigProps {
  type: "sqlite" | "postgres" | "mysql" | "unknown";
  targetUrl: string;
  source: ".env" | "auto-detected" | "manual";
}

// Helper to generate 24-bit RGB ANSI escape codes for smooth gradients
const rgb = (r: number, g: number, b: number) => (text: string) =>
  `\x1b[38;2;${r};${g};${b}m${text}\x1b[39m`;

const l1 = rgb(46, 204, 113); // Bright Green
const l2 = rgb(26, 188, 156); // Teal / Mint
const l3 = rgb(0, 188, 212); // Cyan
const l4 = rgb(52, 152, 219); // Light Blue
const l5 = rgb(174, 214, 241); // Icy Blue / White
const l6 = rgb(244, 246, 247); // Off-white

export function printLogo() {
  console.log(
    pc.bold(
      l1("             ████████╗  ███████╗  ██████╗   ██████╗   ██████╗ \n") +
        l2("             ╚══██╔══╝  ██╔════╝  ██╔══██╗  ██╔══██╗  ██╔══██╗\n") +
        l3("                ██║     █████╗    ██████╔╝  ██║  ██║  ██████╔╝\n") +
        l4("                ██║     ██╔══╝    ██╔══██╗  ██║  ██║  ██╔══██╗\n") +
        l5("                ██║     ███████╗  ██║  ██║  ██████╔╝  ██████╔╝\n") +
        l6("                ╚═╝     ╚══════╝  ╚═╝  ╚═╝  ╚═════╝   ╚═════╝ "),
    ),
  );
}

export function printDashboard(dbConfig: DBConfigProps) {
  const terminalWidth = 74;
  const headerTitle =
    " Lightweight Interactive TUI Database Client  •  v1.0.0-beta.2 ";
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

  let statusVal = "";
  let dbTypeVal = "None";
  let targetVal = "-";
  let sourceVal = "None";

  if (dbConfig.type === "unknown") {
    statusVal = pc.red("Disconnected");
    sourceVal = pc.dim(
      "No configuration found. Please run check to configure.",
    );
  } else {
    statusVal = pc.green("Connected");
    dbTypeVal = dbConfig.type.toUpperCase();
    targetVal = dbConfig.targetUrl;
    sourceVal =
      dbConfig.source === ".env"
        ? "Loaded from project .env file"
        : dbConfig.source === "auto-detected"
          ? "Auto-detected local SQLite file"
          : "Manual connection config";
  }

  const printLine = (label: string, value: string) => {
    const paddedLabel = label.padEnd(12);
    const lineContent = `  ${pc.bold(paddedLabel)}: ${value}`;
    const rawText = `  ${paddedLabel}: ` + value.replace(/\x1b\[[0-9;]*m/g, "");
    const padding = " ".repeat(Math.max(0, terminalWidth - 2 - rawText.length));
    console.log(pc.cyan("║") + lineContent + padding + pc.cyan("║"));
  };

  printLine("Status", statusVal);
  printLine("Database", dbTypeVal);
  printLine(
    "Target",
    targetVal.length > 45 ? "..." + targetVal.slice(-42) : targetVal,
  );
  printLine("Source", sourceVal);
  printLine(
    "Working Dir",
    process.cwd().length > 45
      ? "..." + process.cwd().slice(-42)
      : process.cwd(),
  );

  console.log(pc.cyan(`╚${"═".repeat(terminalWidth - 2)}╝`));
}
