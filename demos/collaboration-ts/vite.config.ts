import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { defineConfig } from "vite";

const demoRoot = fileURLToPath(new URL(".", import.meta.url));
const repositoryRoot = fileURLToPath(new URL("../..", import.meta.url));

export default defineConfig({
  root: demoRoot,
  define: { "process.env": {} },
  resolve: { dedupe: ["yjs", "y-prosemirror"] },
  optimizeDeps: { include: ["yjs", "y-prosemirror"] },
  build: {
    rollupOptions: {
      input: {
        index: resolve(demoRoot, "index.html"),
        client: resolve(demoRoot, "client.html"),
      },
    },
  },
  server: {
    host: "127.0.0.1",
    port: 4404,
    strictPort: true,
    fs: { allow: [repositoryRoot] },
    // KAM_COLLAB_PORTS: 4404 frontend, 4401 WS, 4402 HTTP; legacy demos stay separate.
    proxy: {
      "/kam-collab/api": process.env.KAM_COLLAB_HTTP_TARGET || "http://127.0.0.1:4402",
      "/api": process.env.KAM_COLLAB_HTTP_TARGET || "http://127.0.0.1:4402",
      "/kam-collab/ws": {
        target: process.env.KAM_COLLAB_WS_TARGET || "ws://127.0.0.1:4401",
        ws: true,
        rewrite: path => path.replace(/^\/kam-collab\/ws\/?/, "/"),
      },
    },
  },
});
