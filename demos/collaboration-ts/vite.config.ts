import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { defineConfig } from "vite";

const demoRoot = fileURLToPath(new URL(".", import.meta.url));
const repositoryRoot = fileURLToPath(new URL("../..", import.meta.url));

export default defineConfig({
  root: demoRoot,
  define: { "process.env": {} },
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
    proxy: { "/api": "http://127.0.0.1:4402" },
  },
});
