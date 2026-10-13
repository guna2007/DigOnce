import type { FastifyPluginAsync, FastifyRequest } from "fastify";
import type { CoreDatabase } from "../db/database";
import { assertSameOrigin, requireOperator } from "../auth/session";
import type { ReportCategory, ReportStatus } from "../../shared/contracts";
import { createReport, listOperatorReports, trackReport, updateOperatorReport } from "../services/reports";

interface ReportRoutesOptions {
  database: CoreDatabase;
}

const publicCreateSchema = {
  body: {
    type: "object", required: ["projectId", "category", "description"], additionalProperties: false,
    properties: {
      projectId: { type: "string", minLength: 1, maxLength: 120 },
      category: { type: "string", enum: ["safety", "access", "quality", "other"] },
      description: { type: "string", minLength: 10, maxLength: 500 },
    },
  },
} as const;
const trackSchema = {
  body: {
    type: "object", required: ["receiptToken"], additionalProperties: false,
    properties: { receiptToken: { type: "string", minLength: 40, maxLength: 128, pattern: "^[A-Za-z0-9_-]+$" } },
  },
} as const;
const operatorListSchema = {
  querystring: {
    type: "object", additionalProperties: false,
    properties: { status: { type: "string", enum: ["new", "in_review", "resolved"] } },
  },
} as const;
const reportParamsSchema = {
  params: {
    type: "object", required: ["id"], additionalProperties: false,
    properties: { id: { type: "string", minLength: 1, maxLength: 120 } },
  },
} as const;
const updateSchema = {
  ...reportParamsSchema,
  body: {
    type: "object", required: ["status", "operatorResponse"], additionalProperties: false,
    properties: {
      status: { type: "string", enum: ["new", "in_review", "resolved"] },
      operatorResponse: { type: "string", nullable: true, maxLength: 500 },
    },
  },
} as const;

export const reportRoutes: FastifyPluginAsync<ReportRoutesOptions> = async (app, { database }) => {
  app.post<{ Body: { projectId: string; category: ReportCategory; description: string } }>("/reports", {
    schema: publicCreateSchema,
    config: { rateLimit: { max: 5, timeWindow: "1 minute", groupId: "report-create" } },
    preHandler: async (request: FastifyRequest) => assertSameOrigin(request),
  }, async (request, reply) => reply.code(201).send(createReport(database, request.body)));

  app.post<{ Body: { receiptToken: string } }>("/reports/track", {
    schema: trackSchema,
    config: { rateLimit: { max: 10, timeWindow: "1 minute", groupId: "report-track" } },
    preHandler: async (request: FastifyRequest) => assertSameOrigin(request),
  }, async (request) => trackReport(database, request.body.receiptToken));

  app.get<{ Querystring: { status?: ReportStatus } }>("/operator/reports", {
    schema: operatorListSchema,
    preHandler: async (request: FastifyRequest) => requireOperator(request),
  }, async (request) => ({ items: listOperatorReports(database, request.query.status) }));

  app.patch<{ Params: { id: string }; Body: { status: ReportStatus; operatorResponse: string | null } }>(
    "/operator/reports/:id", {
      schema: updateSchema,
      preHandler: [
        async (request: FastifyRequest) => requireOperator(request),
        async (request: FastifyRequest) => assertSameOrigin(request),
      ],
    },
    async (request) => updateOperatorReport(database, request.params.id, request.body.status, request.body.operatorResponse),
  );
};
