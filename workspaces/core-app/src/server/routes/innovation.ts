import type { FastifyPluginAsync, FastifyRequest } from "fastify";
import { assertSameOrigin, requireOperator } from "../auth/session";
import { ApiFailure } from "../errors";
import type { CoreDatabase } from "../db/database";
import { analyzeCoreScenario, extractCoreNotice } from "../adapters/innovation";

const focusSchema = {
  body: {
    type: "object", required: ["focusProjectId"], additionalProperties: false,
    properties: { focusProjectId: { type: "string", minLength: 1, maxLength: 120 } },
  },
} as const;
const intakeSchema = {
  body: {
    type: "object", required: ["rawText"], additionalProperties: false,
    properties: { rawText: { type: "string", minLength: 50, maxLength: 6000 } },
  },
} as const;

function unavailable(): never {
  throw new ApiFailure(503, "INNOVATION_UNAVAILABLE", "Dig Once Studio and notice intake are unavailable in standalone core mode.");
}

interface InnovationRouteOptions { database: CoreDatabase; enabled: boolean }

export const innovationRoutes: FastifyPluginAsync<InnovationRouteOptions> = async (app, options) => {
  const requireWriteAccess = [
    async (request: FastifyRequest) => requireOperator(request),
    async (request: FastifyRequest) => assertSameOrigin(request),
  ];

  app.post("/operator/coordination/analyze", {
    schema: focusSchema,
    preHandler: requireWriteAccess,
  }, async (request) => {
    if (!options.enabled) unavailable();
    const { focusProjectId } = request.body as { focusProjectId: string };
    return analyzeCoreScenario(options.database, focusProjectId);
  });

  app.post("/operator/intake/extract", {
    schema: intakeSchema,
    config: { rateLimit: { max: 10, timeWindow: "1 minute" } },
    preHandler: requireWriteAccess,
  }, async (request) => {
    if (!options.enabled) unavailable();
    const { rawText } = request.body as { rawText: string };
    return extractCoreNotice(options.database, rawText);
  });
};
