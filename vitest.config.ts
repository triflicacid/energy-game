import { defineConfig, mergeConfig } from "vitest/config";
import viteConfig from "./vite.config";

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      name: "unit",
      environment: "node",
      include: ["src/**/*.spec.ts"],
      exclude: ["node_modules/**", "dist/**"],
      passWithNoTests: true,
    },
  })
);
