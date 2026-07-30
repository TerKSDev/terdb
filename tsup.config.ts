import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  target: "node22",
  platform: "node",
  clean: true,
  minify: true,
  sourcemap: false,
  noExternal: ["@inquirer/prompts", "cli-table3", "picocolors"],
});
