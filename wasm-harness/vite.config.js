import { defineConfig } from "vite";

export default defineConfig({
  server: {
    port: 1430,
    strictPort: true,
    headers: {
      "Cross-Origin-Opener-Policy": "same-origin",
      "Cross-Origin-Embedder-Policy": "credentialless",
    },
  },
});