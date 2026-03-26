import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "/Users/emmanuel/Desktop/apps/ghana-prisons-lms/tests/e2e",
  timeout: 60_000,
  use: {
    baseURL: "http://127.0.0.1:3100",
    headless: true,
  },
  webServer: {
    command: "npm run dev -- --port 3100",
    url: "http://127.0.0.1:3100",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
