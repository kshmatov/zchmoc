import { defineConfig } from "vite";
import { sveltekit } from "@sveltejs/kit/vite";
// @ts-expect-error type error without @types/node package
import process from "node:process";
const host = process.env.TAURI_DEV_HOST;

const headers = {
  "Cross-Origin-Opener-Policy": "same-origin",
  "Cross-Origin-Embedder-Policy": "credentialless",
};

// COOP/COEP enable SharedArrayBuffer (required by chez-scheme-js WASM).
// Vite only applies `server.headers` to static-file responses, so set them on
// every response via a middleware so SvelteKit-served HTML gets them too.
function crossOriginIsolation() {
  /** @param {import("vite").ViteDevServer} server */
  const apply = (server) => {
    /** @type {import("vite").Connect.NextHandleFunction} */
    const middleware = (req, res, next) => {
      for (const [name, value] of Object.entries(headers)) {
        res.setHeader(name, value);
      }
      next();
    };
    server.middlewares.use(middleware);
  };
  return {
    name: "cross-origin-isolation",
    configureServer: apply,
    configurePreviewServer: apply,
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [sveltekit(), crossOriginIsolation()],

  // 1. prevent Vite from obscuring rust errors
  clearScreen: false,
  // 2. tauri expects a fixed port, fail if that port is not available
  server: {
    port: 1420,
    strictPort: true,
    host: host || "127.0.0.1",
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      // 3. tell Vite to ignore watching `src-tauri`
      ignored: ["**/src-tauri/**"],
    },
  },
});
