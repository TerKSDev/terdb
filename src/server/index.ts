import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { serveStatic } from "@hono/node-server/serve-static";
import open from "open";
import path from "path";
import pc from "picocolors";
import { fileURLToPath } from "url";
import { DBConfig } from "../core/types.js";
import { registerApiRoutes } from "./api.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function runStudio(dbConfig: DBConfig) {
  const app = new Hono();

  // Register API routes
  registerApiRoutes(app, dbConfig);

  // Check if we are running in dev mode (src/server) or prod mode (dist/)
  const isDev = __dirname.includes("src") || __dirname.includes("server");
  const studioDistPath = isDev 
    ? path.resolve(__dirname, "../../dist/studio")
    : path.resolve(__dirname, "./studio");
  
  // Custom static middleware for Hono in Node
  const fs = await import("fs/promises");
  
  app.use("/*", serveStatic({ root: path.relative(process.cwd(), studioDistPath) }));

  // Fallback to index.html for SPA routing if needed
  app.get("*", async (c) => {
    const indexPath = path.join(studioDistPath, "index.html");
    try {
      const html = await fs.readFile(indexPath, "utf-8");
      return c.html(html);
    } catch (e) {
      return c.text("Drixio Studio static files not found. Did you run build?", 404);
    }
  });

  const port = 3000;

  console.log(pc.cyan(`\nStarting Drixio Studio on http://localhost:${port}...`));
  console.log(pc.dim(`Press Ctrl+C to stop the server.\n`));

  serve({
    fetch: app.fetch,
    port,
  });

  await open(`http://localhost:${port}`);
}
