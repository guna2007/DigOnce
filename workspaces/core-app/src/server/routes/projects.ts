import type { FastifyPluginAsync, FastifyRequest } from "fastify";
import type { CoreDatabase } from "../db/database";
import { assertSameOrigin, requireOperator } from "../auth/session";
import type { CreateProject, PublishUpdate, Reschedule } from "../../shared/contracts";
import { createProject, editProject, publishProjectUpdate, rescheduleProject } from "../services/projects";

interface ProjectRoutesOptions {
  database: CoreDatabase;
}

const dateSchema = { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" } as const;
const projectParams = {
  params: {
    type: "object", required: ["id"], additionalProperties: false,
    properties: { id: { type: "string", minLength: 1, maxLength: 120 } },
  },
} as const;
const createSchema = {
  body: {
    type: "object",
    required: ["title", "description", "workType", "departmentId", "impact", "status", "startDate", "endDate", "segmentIds", "sourceLabel"],
    properties: {
      title: { type: "string", minLength: 1, maxLength: 160 },
      description: { type: "string", minLength: 1, maxLength: 2000 },
      workType: { type: "string", enum: ["excavation", "resurfacing", "other"] },
      departmentId: { type: "string", minLength: 1, maxLength: 80 },
      impact: { type: "string", minLength: 1, maxLength: 500 },
      status: { type: "string", enum: ["planned", "active"] },
      startDate: dateSchema,
      endDate: dateSchema,
      earliestStartDate: { ...dateSchema, nullable: true },
      latestEndDate: { ...dateSchema, nullable: true },
      segmentIds: { type: "array", minItems: 1, maxItems: 20, items: { type: "string", minLength: 1, maxLength: 120 } },
      sourceLabel: { type: "string", minLength: 1, maxLength: 160 },
    },
    additionalProperties: false,
  },
} as const;
const editSchema = {
  ...projectParams,
  body: {
    type: "object", required: ["version", "reason", "changes"], additionalProperties: false,
    properties: {
      version: { type: "integer", minimum: 1 },
      reason: { type: "string", minLength: 10, maxLength: 500 },
      changes: {
        type: "object", minProperties: 1, additionalProperties: false,
        properties: {
          title: { type: "string", minLength: 1, maxLength: 160 },
          description: { type: "string", minLength: 1, maxLength: 2000 },
          workType: { type: "string", enum: ["excavation", "resurfacing", "other"] },
          departmentId: { type: "string", minLength: 1, maxLength: 80 },
          impact: { type: "string", minLength: 1, maxLength: 500 },
          status: { type: "string", enum: ["planned", "active", "paused", "completed", "cancelled"] },
          actualEndDate: { ...dateSchema, nullable: true },
          earliestStartDate: { ...dateSchema, nullable: true },
          latestEndDate: { ...dateSchema, nullable: true },
          segmentIds: { type: "array", minItems: 1, maxItems: 20, items: { type: "string", minLength: 1, maxLength: 120 } },
          sourceLabel: { type: "string", minLength: 1, maxLength: 160 },
        },
      },
    },
  },
} as const;
const rescheduleSchema = {
  ...projectParams,
  body: {
    type: "object", required: ["version", "startDate", "endDate", "reason"], additionalProperties: false,
    properties: {
      version: { type: "integer", minimum: 1 }, startDate: dateSchema, endDate: dateSchema,
      reason: { type: "string", minLength: 10, maxLength: 500 },
      expectedPeerVersions: {
        type: "object", maxProperties: 100,
        additionalProperties: { type: "integer", minimum: 1 },
      },
    },
  },
} as const;
const updateSchema = {
  ...projectParams,
  body: {
    type: "object", required: ["version", "type", "summary"], additionalProperties: false,
    properties: {
      version: { type: "integer", minimum: 1 },
      type: { type: "string", enum: ["progress", "delay"] },
      summary: { type: "string", minLength: 5, maxLength: 240 },
      reason: { type: "string", minLength: 10, maxLength: 500 },
      revisedEndDate: dateSchema,
    },
  },
} as const;

export const projectRoutes: FastifyPluginAsync<ProjectRoutesOptions> = async (app, { database }) => {
  const requireWriteAccess = [
    async (request: FastifyRequest) => requireOperator(request),
    async (request: FastifyRequest) => assertSameOrigin(request),
  ];

  app.post<{ Body: CreateProject }>("/operator/projects", {
    schema: createSchema,
    preHandler: requireWriteAccess,
  }, async (request, reply) => reply.code(201).send(createProject(database, request.body, process.env.OPERATOR_LABEL?.trim() || "Operator")));

  app.patch<{ Params: { id: string }; Body: { version: number; reason: string; changes: import("../services/projects").ProjectChanges } }>(
    "/operator/projects/:id", { schema: editSchema, preHandler: requireWriteAccess },
    async (request) => editProject(database, request.params.id, request.body.version, request.body.reason, request.body.changes, process.env.OPERATOR_LABEL?.trim() || "Operator"),
  );

  app.post<{ Params: { id: string }; Body: Reschedule }>(
    "/operator/projects/:id/reschedule", { schema: rescheduleSchema, preHandler: requireWriteAccess },
    async (request) => rescheduleProject(database, request.params.id, request.body, process.env.OPERATOR_LABEL?.trim() || "Operator"),
  );

  app.post<{ Params: { id: string }; Body: PublishUpdate }>(
    "/operator/projects/:id/updates", { schema: updateSchema, preHandler: requireWriteAccess },
    async (request, reply) => reply.code(201).send(publishProjectUpdate(database, request.params.id, request.body, process.env.OPERATOR_LABEL?.trim() || "Operator")),
  );
};
