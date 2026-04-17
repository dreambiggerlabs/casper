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
  description: string | null;
  project: string;
  status: TaskStatus;
  assignee: string | null;
}

export type CredentialType = "https_token" | "ssh_key";

export interface Project {
  uuid: string;
  repositoryUrl: string | null;
  credentialType: CredentialType | null;
}

export type ProjectCredential =
  | {
      type: "https_token";
      username?: string;
      token: string;
    }
  | {
      type: "ssh_key";
      privateKey: string;
      passphrase?: string;
    };

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
