import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.test.ts"],
    setupFiles: ["./vitest.setup.ts"],
    testTimeout: 30000, // 30 seconds for database operations
    coverage: {
      reporter: ["text", "lcov"],
      exclude: [
        "node_modules/**",
        "**/*.test.ts",
        "**/*.config.ts",
        "**/types/**",
      ],
    },
  },
});
