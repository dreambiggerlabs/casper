import { HttpError } from "./http-error.js";

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

  static fromZodIssues(
    issues: { path: PropertyKey[]; message: string }[],
    message = "Validation failed",
  ): ValidationError {
    const violations = issues.map((issue) => ({
      field: issue.path.join("."),
      message: issue.message,
    }));

    return new ValidationError(message, violations);
  }
}
