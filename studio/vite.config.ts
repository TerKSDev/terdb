import { defineConfig } from "vite";
import path from "path";

export default defineConfig({
  root: "./studio/app",
  base: "./",
  build: {
    outDir: "../../dist/studio",
    emptyOutDir: true,
  },
  server: {
    port: 3001,
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
      }
    }
  }
});
