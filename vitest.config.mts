import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "edge-runtime",
    include: ["convex/**/*.test.ts", "n8n/**/*.test.ts"],
    server: { deps: { inline: ["convex-test"] } },
  },
});
