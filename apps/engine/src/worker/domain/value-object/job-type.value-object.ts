export const JOB_TYPE_VALUES = [
  "execute_task",
  "cleanup",
  "start_preview",
  "stop_preview",
] as const;

export type JobType = (typeof JOB_TYPE_VALUES)[number];
