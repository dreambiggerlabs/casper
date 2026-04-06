import type { ErrorRequestHandler } from "express";

import { HttpError, ValidationError } from "../errors/http-error.js";
import { logger } from "../logging/logger.js";

export const errorHandler: ErrorRequestHandler = (
  err,
  _request,
  response,
  _next,
) => {
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
