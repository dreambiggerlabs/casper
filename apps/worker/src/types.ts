export type TaskStatus = "pending" | "assigned" | "processing" | "in_progress" | "completed";
export type WorkerStatus = "active" | "inactive";
export type JobType = "execute_task" | "cleanup" | "start_preview" | "stop_preview";
export type JobStatus = "pending" | "in_progress" | "completed" | "failed";

export interface Task {
  uuid: string;
  title: string;
  status: TaskStatus;
  agentId: string | null;
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
  workerId: string;
  type: JobType;
  status: JobStatus;
  taskId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WorkerState {
  workerId: string;
  token: string;
  name: string;
}