import Fastify from "fastify";
import cookie from "@fastify/cookie";
import rateLimit from "@fastify/rate-limit";
import type { CoreDatabase } from "./db/database";
import { openDatabase } from "./db/database";
import { migrateDatabase } from "./db/migrate";
import { registerErrorHandler } from "./errors";
import { publicRoutes } from "./routes/public";
import { sessionRoutes } from "./routes/session";
import { projectRoutes } from "./routes/projects";
import { reportRoutes } from "./routes/reports";
import { innovationRoutes } from "./routes/innovation";

export function buildApp(database: CoreDatabase = openDatabase()) {
  const app = Fastify({
    logger: true,
    ajv: { customOptions: { removeAdditional: false } },
  });
  migrateDatabase(database);
  registerErrorHandler(app);
  app.register(cookie);
  app.register(rateLimit, { global: false });

  app.addHook("onClose", async () => database.close());

  app.get("/api/health", async () => ({ status: "ok" }));
  app.register(publicRoutes, { prefix: "/api/v1", database });
  app.register(sessionRoutes, { prefix: "/api/v1" });
  app.register(projectRoutes, { prefix: "/api/v1", database });
  app.register(reportRoutes, { prefix: "/api/v1", database });
  app.register(innovationRoutes, { prefix: "/api/v1" });

  return app;
}
