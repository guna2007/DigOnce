import type { FastifyPluginAsync } from "fastify";
import type { CoreDatabase } from "../db/database";
import type { ProjectStatus } from "../../shared/contracts";
import { getProject, listDepartments, listProjects, listSegments } from "../services/projects";

interface PublicRoutesOptions {
  database: CoreDatabase;
}

const projectListSchema = {
  querystring: {
    type: "object",
    properties: {
      status: { type: "string", enum: ["planned", "active", "paused", "completed", "cancelled"] },
      departmentId: { type: "string", minLength: 1, maxLength: 80 },
      q: { type: "string", minLength: 1, maxLength: 120 },
    },
    additionalProperties: false,
  },
} as const;

const projectParamsSchema = {
  params: {
    type: "object",
    required: ["id"],
    properties: { id: { type: "string", minLength: 1, maxLength: 120 } },
    additionalProperties: false,
  },
} as const;

export const publicRoutes: FastifyPluginAsync<PublicRoutesOptions> = async (app, { database }) => {
  app.get<{ Querystring: { status?: ProjectStatus; departmentId?: string; q?: string } }>(
    "/projects",
    { schema: projectListSchema },
    async (request) => ({ items: listProjects(database, request.query) }),
  );

  app.get<{ Params: { id: string } }>(
    "/projects/:id",
    { schema: projectParamsSchema },
    async (request) => getProject(database, request.params.id),
  );

  app.get("/segments", async () => ({ items: listSegments(database) }));
  app.get("/departments", async () => ({ items: listDepartments(database) }));
};
