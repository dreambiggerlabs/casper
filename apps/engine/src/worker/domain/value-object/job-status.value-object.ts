export const JOB_STATUS_VALUES = [
  "ready",
  "in_progress",
  "completed",
  "failed",
] as const;

export type JobStatus = (typeof JOB_STATUS_VALUES)[number];
