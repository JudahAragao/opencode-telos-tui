import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    exclude: ["node_modules", "dist"],
    globals: true,
    pool: "threads",
    poolOptions: {
      threads: {
        singleThread: true
      }
    },
    sequence: {
      shuffle: false
    },
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: ["node_modules", "dist", "**/*.test.ts", "**/*.test.tsx", "**/*.d.ts"]
    }
  }
})