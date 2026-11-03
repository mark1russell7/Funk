import { defineConfig } from "vite";

// The Pages workflow sets SITE_BASE to "/Funk". A local build uses the root.
const env = (globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env ?? {};
const base = env["SITE_BASE"] ? `${env["SITE_BASE"].replace(/\/$/, "")}/` : "/";

// The site has one page: the three live views and the small parts. The deploy adds `status/` and `releases/`.
export default defineConfig({
  base,
  build: { target: "es2022" },
  define: {
    __BUILD__: JSON.stringify({ sha: (env["GITHUB_SHA"] ?? "local").slice(0, 7), date: new Date().toISOString().slice(0, 10) }),
  },
});
