#!/usr/bin/env node
import { main } from "../src/cli/main.js";

main().catch((error) => {
  if (error.name === "ExitPromptError") {
    console.log("\n Exit Drix.");
    process.exit(0);
  }
  console.error("\n Error: ", error);
  process.exit(1);
});
