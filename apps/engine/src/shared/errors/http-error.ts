export class HttpError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

export class NotFoundError extends HttpError {
  constructor(resource: string, identifier: string) {
    super(404, `${resource} with identifier '${identifier}' not found`);
    this.name = "NotFoundError";
  }
}

export interface ValidationViolation {
  field: string;
  message: string;
}

export class ValidationError extends HttpError {
  constructor(
    message: string,
    public readonly violations: ValidationViolation[] = [],
  ) {
    super(400, message);
    this.name = "ValidationError";
  }
}

export function zodIssuesToViolations(
  issues: { path: PropertyKey[]; message: string }[],
): ValidationViolation[] {
  return issues.map((issue) => ({
    field: issue.path.join("."),
    message: issue.message,
  }));
}
