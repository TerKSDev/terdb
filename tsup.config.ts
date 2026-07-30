import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    cli: "bin/cli.ts"
  },
  format: ["esm"],
  target: "node22",
  platform: "node",
  clean: true,
  minify: true,
  sourcemap: false,
  splitting: false,
  external: ["node:sqlite"],
});
