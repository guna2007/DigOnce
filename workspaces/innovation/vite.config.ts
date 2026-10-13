import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);

export default defineConfig({
  root: fileURLToPath(new URL("./harness", import.meta.url)),
  plugins: [react()],
  server: { fs: { allow: [fileURLToPath(new URL("../..", import.meta.url))] } },
  resolve: {
    dedupe: ["react", "react-dom"],
    alias: {
      "@onedig/innovation": fileURLToPath(new URL("./src", import.meta.url)),
      "@testing-library/react": require.resolve("@testing-library/react"),
      "@testing-library/user-event": require.resolve("@testing-library/user-event"),
      "@testing-library/jest-dom": require.resolve("@testing-library/jest-dom"),
    },
  },
  build: { outDir: "../dist-harness", emptyOutDir: true },
  test: {
    environment: "jsdom",
    setupFiles: [],
    include: ["../../../tests/innovation/**/*.test.{ts,tsx}"],
  },
});
