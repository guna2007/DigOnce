import Fastify from "fastify";
import type { CoreDatabase } from "./db/database";
import { openDatabase } from "./db/database";
import { migrateDatabase } from "./db/migrate";
import { registerErrorHandler } from "./errors";
import { publicRoutes } from "./routes/public";

export function buildApp(database: CoreDatabase = openDatabase()) {
  const app = Fastify({
    logger: true,
    ajv: { customOptions: { removeAdditional: false } },
  });
  migrateDatabase(database);
  registerErrorHandler(app);

  app.addHook("onClose", async () => database.close());

  app.get("/api/health", async () => ({ status: "ok" }));
  app.register(publicRoutes, { prefix: "/api/v1", database });

  return app;
}
