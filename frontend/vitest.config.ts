import { defineConfig } from "vitest/config"

// Unit tests only — pure logic in lib/. Playwright e2e (`e2e/*.spec.ts`) is run
// separately via `pnpm test:e2e` and must NOT be picked up here (it imports
// @playwright/test, which is not a vitest runner).
export default defineConfig({
  test: {
    environment: "node",
    include: ["lib/**/*.test.ts", "hooks/**/*.test.ts"],
    exclude: ["node_modules/**", "e2e/**", ".next/**"],
  },
})
