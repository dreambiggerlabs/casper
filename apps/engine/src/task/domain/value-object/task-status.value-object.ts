export const TASK_STATUS_VALUES = [
  "backlog",
  "ready",
  "in_progress",
  "review",
  "completed",
] as const;

export type TaskStatus = (typeof TASK_STATUS_VALUES)[number];
