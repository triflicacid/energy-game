import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    name: "unit",
    environment: "node",
    include: ["src/**/*.spec.ts"],
    exclude: ["node_modules/**", "dist/**"],
    passWithNoTests: true,
  },
});
