import type { WorkerStatus } from "@/worker/domain/value-object/worker-status.value-object.js";

export interface Worker {
  "@id": string;
  uuid: string;
  name: string;
  token: string;
  status: WorkerStatus;
  lastHeartbeatAt: Date | null;
  createdAt: Date;
  updatedAt: Date | null;
}
