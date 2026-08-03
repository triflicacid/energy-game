import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [viteSingleFile()],
  base: "./",
  publicDir: "static",
  resolve: {
    alias: {
      "@application": resolve(__dirname, "src/application"),
      "@content": resolve(__dirname, "src/content"),
      "@simulation": resolve(__dirname, "src/simulation"),
      "@generation": resolve(__dirname, "src/generation"),
      "@rendering": resolve(__dirname, "src/rendering"),
      "@ui": resolve(__dirname, "src/ui"),
      "@persistence": resolve(__dirname, "src/persistence"),
      "@platform": resolve(__dirname, "src/platform"),
      "@shared": resolve(__dirname, "src/shared"),
    },
  },
  server: {
    port: 5173,
  },
  build: {
    outDir: "dist/web",
    emptyOutDir: true,
  },
});
