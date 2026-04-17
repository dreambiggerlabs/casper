import { homedir } from "os";
import { join } from "path";
import { mkdir, readFile, writeFile } from "fs/promises";

import type { WorkerState } from "./types.js";

const CASPER_DIR = ".casper";
const WORKER_STATE_FILE = "worker.json";

function getWorkerStatePath(): string {
  return join(homedir(), CASPER_DIR, WORKER_STATE_FILE);
}

export function getProjectsBasePath(): string {
  return join(homedir(), CASPER_DIR, "projects");
}

async function ensureCasperDir(): Promise<void> {
  const casperDir = join(homedir(), CASPER_DIR);
  try {
    await mkdir(casperDir, { recursive: true });
  } catch (error) {
    // Ignore if directory already exists
    if ((error as NodeJS.ErrnoException).code !== "EEXIST") {
      throw error;
    }
  }
}

export async function loadWorkerState(): Promise<WorkerState | null> {
  try {
    const statePath = getWorkerStatePath();
    const data = await readFile(statePath, "utf-8");

    return JSON.parse(data) as WorkerState;
  } catch (error) {
    // File doesn't exist or is invalid
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return null;
    }
    throw error;
  }
}

export async function saveWorkerState(state: WorkerState): Promise<void> {
  await ensureCasperDir();
  const statePath = getWorkerStatePath();
  await writeFile(statePath, JSON.stringify(state, null, 2), "utf-8");
}
