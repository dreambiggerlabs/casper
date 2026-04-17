import type { RequestHandler } from "express";

import { HttpError } from "../errors/index.js";
import type { Worker, WorkerReader } from "../../worker/worker.types.js";

declare module "express-serve-static-core" {
  interface Request {
    worker?: Worker;
  }
}

const BEARER_PREFIX = "Bearer ";

export function workerAuthMiddleware(
  workerReader: WorkerReader,
): RequestHandler {
  return async (req, _res, next) => {
    const header = req.headers.authorization;
    if (!header || !header.startsWith(BEARER_PREFIX)) {
      next(new HttpError(401, "Missing or malformed Authorization header"));

      return;
    }

    const token = header.slice(BEARER_PREFIX.length).trim();
    if (!token) {
      next(new HttpError(401, "Empty bearer token"));

      return;
    }

    try {
      const worker = await workerReader.findByToken(token);
      if (!worker) {
        next(new HttpError(401, "Invalid worker token"));

        return;
      }
      req.worker = worker;
      next();
    } catch (err) {
      next(err);
    }
  };
}
