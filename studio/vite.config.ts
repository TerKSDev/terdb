import { defineConfig } from "vite";

export default defineConfig({
  root: "./studio",
  base: "./",
  build: {
    outDir: "../dist/studio",
    emptyOutDir: true,
  },
  server: {
    port: 51214,
    proxy: {
      "/api": {
        target: "http://localhost:51213",
        changeOrigin: true,
      },
    },
  },
});
