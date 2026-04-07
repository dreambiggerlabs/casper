import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/e2e/**/*.test.ts"],
    globalSetup: ["tests/helpers/setup.ts"],
    testTimeout: 30000,
    hookTimeout: 60000,
    fileParallelism: false,
  },
});
