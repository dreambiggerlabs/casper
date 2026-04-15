export type TaskStatus =
  | "backlog"
  | "ready"
  | "in_progress"
  | "review"
  | "completed";
export type WorkerStatus = "active" | "inactive";
export type JobType =
  | "execute_task"
  | "cleanup"
  | "start_preview"
  | "stop_preview";
export type JobStatus = "ready" | "in_progress" | "completed" | "failed";

export interface Task {
  uuid: string;
  title: string;
  status: TaskStatus;
  assignee: string | null;
}

export interface Worker {
  uuid: string;
  name: string;
  token: string;
  status: WorkerStatus;
  lastHeartbeatAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WorkerJob {
  uuid: string;
  worker: string;
  type: JobType;
  status: JobStatus;
  task: string | null;
  failReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WorkerState {
  workerId: string;
  token: string;
  name: string;
}
