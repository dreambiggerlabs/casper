import { HttpError } from "./http-error.js";

export class NotFoundError extends HttpError {
  constructor(resource: string, identifier: string) {
    super(404, `${resource} with identifier '${identifier}' not found`);
    this.name = "NotFoundError";
  }
}
