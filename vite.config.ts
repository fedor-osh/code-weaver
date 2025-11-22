import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "out/webview",
    emptyOutDir: true,
    rollupOptions: {
      input: path.resolve(path.dirname(fileURLToPath(import.meta.url)), "src/webview/index.html"),
      output: {
        entryFileNames: "webview.js",
        assetFileNames: (assetInfo) => {
          if (assetInfo.name?.endsWith(".css")) {
            return "webview.css";
          }
          return assetInfo.name || "asset";
        },
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(path.dirname(fileURLToPath(import.meta.url)), "src"),
    },
  },
});

