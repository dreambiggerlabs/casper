import "dotenv/config";
import { hostname } from "os";

import { EngineClient } from "./engine-client.js";
import { JobProcessor } from "./job-processor.js";
import { PollingLoop } from "./polling-loop.js";
import { loadWorkerState, saveWorkerState } from "./worker-state.js";

const ENGINE_URL = process.env["ENGINE_URL"];
const WORKER_NAME = process.env["WORKER_NAME"]?.trim() || hostname() || `worker-${Date.now()}`;

if (!ENGINE_URL) {
  throw new Error("ENGINE_URL environment variable is required");
}

const engineClient = new EngineClient(ENGINE_URL);

async function main(): Promise<void> {
  // Try to load existing worker state
  let workerState = await loadWorkerState();

  if (!workerState) {
    // Register a new worker
    console.log(`[Worker] Registering new worker with name: ${WORKER_NAME}`);
    const worker = await engineClient.registerWorker(WORKER_NAME);
    workerState = {
      workerId: worker.uuid,
      token: worker.token,
      name: worker.name,
    };
    await saveWorkerState(workerState);
    console.log(`[Worker] Registered with ID: ${workerState.workerId}`);
  } else {
    console.log(`[Worker] Using existing worker ID: ${workerState.workerId}`);
    // Send initial heartbeat to confirm worker exists
    await engineClient.heartbeat(workerState.workerId);
  }

  const jobProcessor = new JobProcessor(engineClient);
  const pollingLoop = new PollingLoop(
    engineClient,
    jobProcessor,
    workerState.workerId,
  );

  pollingLoop.start();
}

main().catch((error) => {
  console.error("[Worker] Fatal error:", error);
  process.exit(1);
});