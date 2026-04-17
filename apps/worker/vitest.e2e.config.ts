import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/e2e/**/*.test.ts"],
    globalSetup: ["../engine/tests/helpers/setup.ts"],
    setupFiles: ["../engine/tests/helpers/setup-env.ts"],
    testTimeout: 30000,
    hookTimeout: 60000,
  },
});
