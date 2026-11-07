import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": new URL("./src", import.meta.url).pathname,
      "server-only": new URL(
        "./src/tests/stubs/server-only.ts",
        import.meta.url,
      ).pathname,
    },
  },
  test: {
    environment: "node",
    include: [
      "src/tests/unit/**/*.test.ts",
      "src/tests/integration/**/*.test.ts",
    ],
    coverage: {
      reporter: ["text", "html"],
    },
  },
});
