import { Hono } from "hono";
import { DBConfig } from "../core/types.js";
import { createDBAdapter } from "../core/factory.js";

export function registerApiRoutes(app: Hono, dbConfig: DBConfig) {
  const api = new Hono();
  
  // Middleware to lazily create adapter per request or use a global one
  // For simplicity, we create one for the API lifecycle
  const adapter = createDBAdapter(dbConfig as any);

  api.get("/tables", async (c) => {
    try {
      const tables = await adapter.getTables();
      return c.json({ success: true, data: tables });
    } catch (e: any) {
      return c.json({ success: false, error: e.message }, 500);
    }
  });

  api.get("/tables/:name/schema", async (c) => {
    const tableName = c.req.param("name");
    try {
      const schema = await adapter.getSchema(tableName);
      return c.json({ success: true, data: schema });
    } catch (e: any) {
      return c.json({ success: false, error: e.message }, 500);
    }
  });

  api.get("/tables/:name/data", async (c) => {
    const tableName = c.req.param("name");
    const limit = parseInt(c.req.query("limit") || "50", 10);
    const offset = parseInt(c.req.query("offset") || "0", 10);
    const whereClause = c.req.query("where") || "";

    try {
      const data = await adapter.getData(tableName, limit, offset, whereClause);
      return c.json({ success: true, data });
    } catch (e: any) {
      return c.json({ success: false, error: e.message }, 500);
    }
  });

  api.post("/query", async (c) => {
    try {
      const { sql } = await c.req.json();
      const result = await adapter.query(sql);
      return c.json({ success: true, data: result });
    } catch (e: any) {
      return c.json({ success: false, error: e.message }, 500);
    }
  });

  app.route("/api", api);
}
