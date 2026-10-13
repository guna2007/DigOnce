import type { FastifyPluginAsync, FastifyRequest } from "fastify";
import { createSessionToken, isOperatorPasswordValid, OPERATOR_COOKIE, readSessionToken, sessionCookieOptions } from "../auth/session";
import { ApiFailure } from "../errors";

function assertSameOrigin(request: FastifyRequest): void {
  const origin = request.headers.origin;
  if (!origin) throw new ApiFailure(403, "FORBIDDEN_ORIGIN", "This request origin is not allowed.");

  try {
    const originUrl = new URL(origin);
    const configuredOrigin = process.env.APP_ORIGIN;
    const allowed = configuredOrigin
      ? originUrl.origin === new URL(configuredOrigin).origin
      : originUrl.hostname === request.hostname;
    if (!allowed) throw new ApiFailure(403, "FORBIDDEN_ORIGIN", "This request origin is not allowed.");
  } catch (error) {
    if (error instanceof ApiFailure) throw error;
    throw new ApiFailure(403, "FORBIDDEN_ORIGIN", "This request origin is not allowed.");
  }
}

const loginSchema = {
  body: {
    type: "object",
    required: ["password"],
    properties: { password: { type: "string", minLength: 1, maxLength: 256 } },
    additionalProperties: false,
  },
} as const;

export const sessionRoutes: FastifyPluginAsync = async (app) => {
  app.get("/operator/session", async (request) => {
    const session = readSessionToken(request.cookies[OPERATOR_COOKIE]);
    return { authenticated: Boolean(session) };
  });

  app.post<{ Body: { password: string } }>("/operator/session", {
    schema: loginSchema,
    config: { rateLimit: { max: 5, timeWindow: "1 minute" } },
    preHandler: async (request) => assertSameOrigin(request),
  }, async (request, reply) => {
    if (!isOperatorPasswordValid(request.body.password)) {
      throw new ApiFailure(401, "UNAUTHENTICATED", "The password is incorrect or operator access is not configured.");
    }
    const token = createSessionToken();
    if (!token) throw new ApiFailure(401, "UNAUTHENTICATED", "Operator access is not configured.");
    reply.setCookie(OPERATOR_COOKIE, token, sessionCookieOptions());
    return { authenticated: true, operatorLabel: process.env.OPERATOR_LABEL?.trim() || "Operator" };
  });

  app.delete("/operator/session", {
    preHandler: async (request) => assertSameOrigin(request),
  }, async (_request, reply) => {
    reply.clearCookie(OPERATOR_COOKIE, { path: "/", sameSite: "strict", secure: process.env.NODE_ENV === "production" });
    return reply.code(204).send();
  });
};
