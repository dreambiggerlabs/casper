import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
  test: {
    include: ["tests/e2e/**/*.test.ts"],
    globalSetup: ["tests/helpers/setup.ts"],
    setupFiles: ["tests/helpers/setup-env.ts"],
    testTimeout: 30000,
    hookTimeout: 60000,
    fileParallelism: false,
  },
});
