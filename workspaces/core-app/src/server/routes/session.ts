import type { FastifyPluginAsync } from "fastify";
import { assertSameOrigin, createSessionToken, isOperatorPasswordValid, OPERATOR_COOKIE, readSessionToken, sessionCookieOptions } from "../auth/session";
import { ApiFailure } from "../errors";

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
