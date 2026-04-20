import type { ErrorRequestHandler } from "express";

import { HttpError } from "@/shared/domain/error/http-error.js";
import { ValidationError } from "@/shared/domain/error/validation.error.js";
import type { Logger } from "@/shared/infrastructure/logging/logger.js";

export class ErrorHandlerMiddleware {
  constructor(private readonly logger: Logger) {}

  handle(): ErrorRequestHandler {
    const logger = this.logger;

    return (err, _request, response, _next) => {
      if (err instanceof ValidationError) {
        response.status(err.statusCode).json({
          error: err.message,
          violations: err.violations,
        });

        return;
      }

      if (err instanceof HttpError) {
        response.status(err.statusCode).json({ error: err.message });

        return;
      }

      logger.error({ err }, "Unhandled error");
      response.status(500).json({ error: "Internal server error" });
    };
  }
}
