import { fileURLToPath } from "node:url";
import path from "node:path";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { viteSingleFile } from "vite-plugin-singlefile";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");

/** Swap the server-backed modules for browser-only versions in this build. */
function swapServerModules(): Plugin {
  const map: Record<string, string> = {
    [path.join(root, "src/lib/hive/mc.ts")]: path.join(here, "mc-qwen.ts"),
    [path.join(root, "src/lib/github/api.ts")]: path.join(here, "github-stub.ts"),
  };
  return {
    name: "hive-artifact-swap",
    enforce: "pre",
    async resolveId(source, importer, options) {
      // The artifact's own modules import the real mc.ts; only Hive's source is redirected.
      if (importer && importer.startsWith(here)) return null;
      const resolved = await this.resolve(source, importer, { ...options, skipSelf: true });
      if (resolved && map[resolved.id]) return map[resolved.id];
      return null;
    },
  };
}

export default defineConfig({
  root,
  configFile: false,
  plugins: [swapServerModules(), react(), tailwindcss(), viteSingleFile()],
  resolve: { alias: { "@": path.join(root, "src") } },
  define: { "process.env.NODE_ENV": JSON.stringify("production") },
  build: {
    outDir: path.join(here, "dist"),
    emptyOutDir: true,
    target: "es2022",
    chunkSizeWarningLimit: 6000,
    rollupOptions: { input: path.join(here, "index.html") },
  },
});
