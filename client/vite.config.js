import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

function suppressWsProxyErrors() {
  return {
    name: "suppress-ws-proxy-errors",
    configureServer(server) {
      server.httpServer?.on("upgrade", (req, socket, head) => {
        // Vite internally upgrades WebSocket connections for its own HMR/proxy layer.
        // When a browser tab closes or the server restarts, the stale socket emits
        // "ECONNRESET" / "ECONNABORTED".  These are harmless but spam the terminal
        // with full stack traces.  Silently swallow them — the WebSocket proxy in
        // vite.config.js already swallows http-proxy errors for the same reason.
        socket.on("error", (err) => {
          if (
            err.code === "ECONNRESET" ||
            err.code === "ECONNABORTED" ||
            err.message?.includes("read ECONNRESET") ||
            err.message?.includes("write ECONNABORTED")
          ) {
            // stale connection after tab close / reload — ignore
            return;
          }
          console.error("[WS Proxy Error]", err);
        });
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), suppressWsProxyErrors()],
  server: {
    port: 5173,
    proxy: {
      "/socket.io": {
        target: "http://localhost:3001",
        ws: true,
        configure: (proxy) => {
          // These fire whenever a tab reloads or the server restarts mid-connection —
          // harmless, but they spam the terminal with stack traces if left unhandled.
          proxy.on("error", () => {});
        },
      },
"/ice-servers": {
        target: "http://localhost:3001",
      },
      "/upload": {
        target: "http://localhost:3001",
      },
      "/download": {
        target: "http://localhost:3001",
      },
    },
  },
});
