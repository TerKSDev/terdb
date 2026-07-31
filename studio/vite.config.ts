import { defineConfig } from "vite";

export default defineConfig({
  root: "./studio",
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
