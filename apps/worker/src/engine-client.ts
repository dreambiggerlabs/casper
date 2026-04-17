import type {
  Project,
  ProjectCredential,
  Task,
  Worker,
  WorkerJob,
} from "./types.js";

export class EngineClient {
  private workerToken: string | null = null;

  constructor(private readonly engineUrl: string) {}

  setWorkerToken(token: string): void {
    this.workerToken = token;
  }

  async registerWorker(name?: string): Promise<Worker> {
    const body = name ? { name } : {};
    const response = await fetch(`${this.engineUrl}/workers`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      throw new Error(
        `Failed to register worker: ${response.status} ${response.statusText}`,
      );
    }

    return response.json() as Promise<Worker>;
  }

  async heartbeat(workerId: string): Promise<Worker> {
    const response = await fetch(
      `${this.engineUrl}/workers/${workerId}/heartbeat`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      },
    );
    if (!response.ok) {
      throw new Error(
        `Failed to send heartbeat: ${response.status} ${response.statusText}`,
      );
    }

    return response.json() as Promise<Worker>;
  }

  async fetchPendingJobs(workerId: string): Promise<WorkerJob[]> {
    const response = await fetch(
      `${this.engineUrl}/jobs?worker=/workers/${workerId}&status=ready`,
    );
    if (!response.ok) {
      throw new Error(
        `Failed to fetch jobs: ${response.status} ${response.statusText}`,
      );
    }
    const collection = (await response.json()) as { member: WorkerJob[] };

    return collection.member ?? [];
  }

  async getJob(jobUuid: string): Promise<WorkerJob> {
    const response = await fetch(`${this.engineUrl}/jobs/${jobUuid}`);
    if (!response.ok) {
      throw new Error(
        `Failed to get job: ${response.status} ${response.statusText}`,
      );
    }

    return response.json() as Promise<WorkerJob>;
  }

  async updateJobStatus(
    jobUuid: string,
    status: WorkerJob["status"],
    failReason?: string,
  ): Promise<WorkerJob> {
    const body: Record<string, string> = { status };
    if (failReason !== undefined) {
      body["failReason"] = failReason;
    }
    const response = await fetch(`${this.engineUrl}/jobs/${jobUuid}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      throw new Error(
        `Failed to update job status: ${response.status} ${response.statusText}`,
      );
    }

    return response.json() as Promise<WorkerJob>;
  }

  async getProject(projectUuid: string): Promise<Project> {
    const response = await fetch(`${this.engineUrl}/projects/${projectUuid}`);
    if (!response.ok) {
      throw new Error(
        `Failed to get project: ${response.status} ${response.statusText}`,
      );
    }

    return response.json() as Promise<Project>;
  }

  async getProjectCredential(
    projectUuid: string,
  ): Promise<ProjectCredential | null> {
    if (!this.workerToken) {
      throw new Error(
        "Worker token not set on EngineClient; cannot fetch credential",
      );
    }
    const response = await fetch(
      `${this.engineUrl}/projects/${projectUuid}/credential`,
      { headers: { Authorization: `Bearer ${this.workerToken}` } },
    );
    if (response.status === 404) return null;
    if (!response.ok) {
      throw new Error(
        `Failed to get project credential: ${response.status} ${response.statusText}`,
      );
    }

    return response.json() as Promise<ProjectCredential>;
  }

  async getTask(taskUuid: string): Promise<Task> {
    const response = await fetch(`${this.engineUrl}/tasks/${taskUuid}`);
    if (!response.ok) {
      throw new Error(
        `Failed to get task: ${response.status} ${response.statusText}`,
      );
    }

    return response.json() as Promise<Task>;
  }

  async claimTask(
    workerId: string,
  ): Promise<{ job: WorkerJob; task: Task } | null> {
    const response = await fetch(`${this.engineUrl}/tasks/claim`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ worker: `/workers/${workerId}` }),
    });
    if (response.status === 204) return null;
    if (!response.ok) {
      throw new Error(
        `Failed to claim task: ${response.status} ${response.statusText}`,
      );
    }

    return response.json() as Promise<{ job: WorkerJob; task: Task }>;
  }

  async updateTaskStatus(
    taskUuid: string,
    status: Task["status"],
  ): Promise<Task> {
    const response = await fetch(`${this.engineUrl}/tasks/${taskUuid}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!response.ok) {
      throw new Error(
        `Failed to update task status: ${response.status} ${response.statusText}`,
      );
    }

    return response.json() as Promise<Task>;
  }
}
