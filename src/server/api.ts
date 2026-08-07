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

  api.get("/config", (c) => {
    return c.json({ success: true, data: { dbType: dbConfig.type } });
  });

  api.get("/tables/stats", async (c) => {
    try {
      const tables = await adapter.getTables();
      const stats: Record<string, number> = {};
      for (const t of tables) {
         try {
           const res = await adapter.query(`SELECT COUNT(*) as c FROM ${adapter.quoteIdentifier(t)}`);
           // Different adapters might return row keys differently, try to extract count safely
           if (res && res.rows && res.rows.length > 0) {
              const row = res.rows[0];
              const countVal = Object.values(row)[0];
              stats[t] = parseInt(String(countVal), 10) || 0;
           } else {
              stats[t] = 0;
           }
         } catch(e) {
           stats[t] = 0;
         }
      }
      return c.json({ success: true, data: stats });
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

  api.get("/tables/:name/indexes", async (c) => {
    const tableName = c.req.param("name");
    try {
      const indexes = await adapter.getIndexes(tableName);
      return c.json({ success: true, data: indexes });
    } catch (e: any) {
      return c.json({ success: false, error: e.message }, 500);
    }
  });

  api.get("/tables/:name/data", async (c) => {
    const tableName = c.req.param("name");
    const limit = parseInt(c.req.query("limit") || "50", 10);
    const offset = parseInt(c.req.query("offset") || "0", 10);
    const whereClause = c.req.query("where") || "";
    const orderCol = c.req.query("orderCol");
    const orderAscStr = c.req.query("orderAsc");
    
    let orderBy = undefined;
    if (orderCol) {
      orderBy = { col: orderCol, asc: orderAscStr !== "false" };
    }

    try {
      const data = await adapter.getData(tableName, limit, offset, whereClause, orderBy);
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
