import type { FastifyError, FastifyInstance } from "fastify";
import type { ApiError } from "../shared/contracts";

export class ApiFailure extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: string,
    message: string,
    readonly details?: Record<string, string>,
  ) {
    super(message);
    this.name = "ApiFailure";
  }
}

export function registerErrorHandler(app: FastifyInstance): void {
  app.setErrorHandler((error: FastifyError | ApiFailure, request, reply) => {
    if (error instanceof ApiFailure) {
      const body: ApiError = {
        error: {
          code: error.code,
          message: error.message,
          ...(error.details ? { details: error.details } : {}),
          requestId: request.id,
        },
      };
      return reply.code(error.statusCode).send(body);
    }

    if (error.validation) {
      const body: ApiError = {
        error: {
          code: "VALIDATION_ERROR",
          message: "The request is invalid.",
          requestId: request.id,
        },
      };
      return reply.code(400).send(body);
    }

    if (error.statusCode === 429) {
      const body: ApiError = {
        error: {
          code: "RATE_LIMITED",
          message: "Too many requests. Wait a moment and try again.",
          requestId: request.id,
        },
      };
      return reply.code(429).send(body);
    }

    request.log.error({ err: error }, "Unhandled API error");
    const body: ApiError = {
      error: {
        code: "INTERNAL_ERROR",
        message: "The request could not be completed.",
        requestId: request.id,
      },
    };
    return reply.code(500).send(body);
  });
}
