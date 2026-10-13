import "dotenv/config";
import { buildApp } from "./app";

const app = buildApp(undefined, { serveStatic: process.env.NODE_ENV === "production" });
const port = Number(process.env.PORT ?? 3001);
const host = process.env.HOST ?? "127.0.0.1";

try {
  await app.listen({ port, host });
} catch (error) {
  app.log.error(error);
  process.exitCode = 1;
}
