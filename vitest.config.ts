import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/__tests__/**/*.test.{ts,tsx}"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      include: [
        "src/engine/**/*.ts",
        "src/services/**/*.ts",
        "src/app/api/**/*.ts",
        "src/components/**/*.{ts,tsx}",
        "src/hooks/**/*.ts",
        "src/i18n/**/*.ts",
        "src/middleware.ts",
        "src/app/page.tsx",
      ],
      exclude: ["src/**/__tests__/**", "src/**/index.ts"],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
