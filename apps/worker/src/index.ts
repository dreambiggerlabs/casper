import "dotenv/config";
import { hostname } from "os";

import { EngineClient } from "./engine-client.js";
import { JobProcessor } from "./job-processor.js";
import { PollingLoop } from "./polling-loop.js";
import { loadWorkerState, saveWorkerState } from "./worker-state.js";
import { logger } from "./logging/logger.js";

const ENGINE_URL = process.env["ENGINE_URL"];
const WORKER_NAME =
  process.env["WORKER_NAME"]?.trim() || hostname() || `worker-${Date.now()}`;

if (!ENGINE_URL) {
  throw new Error("ENGINE_URL environment variable is required");
}

const engineClient = new EngineClient(ENGINE_URL);

async function main(): Promise<void> {
  // Try to load existing worker state
  let workerState = await loadWorkerState();

  if (!workerState) {
    // Register a new worker
    logger.info({ workerName: WORKER_NAME }, "Registering new worker");
    const worker = await engineClient.registerWorker(WORKER_NAME);
    workerState = {
      workerId: worker.uuid,
      token: worker.token,
      name: worker.name,
    };
    await saveWorkerState(workerState);
    logger.info({ workerId: workerState.workerId }, "Worker registered");
  } else {
    logger.info({ workerId: workerState.workerId }, "Using existing worker");
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
  logger.fatal({ err: error }, "Fatal error");
  process.exit(1);
});
