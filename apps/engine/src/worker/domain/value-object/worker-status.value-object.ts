export const WORKER_STATUS_VALUES = ["active", "inactive"] as const;

export type WorkerStatus = (typeof WORKER_STATUS_VALUES)[number];
