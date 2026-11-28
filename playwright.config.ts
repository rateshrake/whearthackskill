import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright E2E & Accessibility Configuration
 * VayuShield - Virtual Challenge 6
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  ...(process.env.CI ? { workers: 1 } : {}),
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    permissions: ["clipboard-read", "clipboard-write"],
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: process.env.CI ? "npm run start:standalone" : "npm run dev -- -p 3000",
    port: 3000,
    reuseExistingServer: !process.env.CI,
    timeout: 60000,
  },
});
