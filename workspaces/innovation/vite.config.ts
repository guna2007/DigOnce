import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

export default defineConfig({
  root: fileURLToPath(new URL("./harness", import.meta.url)),
  plugins: [react()],
  server: { fs: { allow: [fileURLToPath(new URL("../..", import.meta.url))] } },
  resolve: {
    alias: {
      "@onedig/innovation": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  build: { outDir: "../dist-harness", emptyOutDir: true },
  test: {
    environment: "jsdom",
    setupFiles: [],
    include: ["../../../tests/innovation/**/*.test.{ts,tsx}"],
  },
});
