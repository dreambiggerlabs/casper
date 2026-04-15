/**
 * Test fixtures — thin wrappers around the shared seed factories.
 *
 * Re-exports the factories with `createTest*` aliases for clarity in tests,
 * and provides `resetFixtureCounter` for isolation between test runs.
 */
export {
  createProject as createTestProject,
  createAgent as createTestAgent,
  createUser as createTestUser,
  createTask as createTestTask,
  createWorker as createTestWorker,
  createJob as createTestJob,
  resetCounter as resetFixtureCounter,
} from "../../src/shared/seed/index.js";
