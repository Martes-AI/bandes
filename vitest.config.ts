import { defineConfig } from "vitest/config";

// Config separata da vite.config.ts: i test non hanno bisogno del plugin Cloudflare.
export default defineConfig({
  test: { include: ["test/**/*.test.ts"] },
});
