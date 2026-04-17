import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/integration/**/*.test.ts"],
    globalSetup: ["../engine/tests/helpers/setup.ts"],
    setupFiles: ["../engine/tests/helpers/setup-env.ts"],
    testTimeout: 15000,
    hookTimeout: 30000,
  },
});
