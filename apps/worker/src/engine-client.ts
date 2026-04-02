import type { Task, Worker, WorkerJob } from "./types.js";

export class EngineClient {
  constructor(private readonly engineUrl: string) {}

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
      `${this.engineUrl}/jobs?workerId=${workerId}&status=pending`,
    );
    if (!response.ok) {
      throw new Error(
        `Failed to fetch jobs: ${response.status} ${response.statusText}`,
      );
    }
    return response.json() as Promise<WorkerJob[]>;
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

  async updateJobStatus(jobUuid: string, status: WorkerJob["status"]): Promise<WorkerJob> {
    const response = await fetch(`${this.engineUrl}/jobs/${jobUuid}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!response.ok) {
      throw new Error(
        `Failed to update job status: ${response.status} ${response.statusText}`,
      );
    }
    return response.json() as Promise<WorkerJob>;
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