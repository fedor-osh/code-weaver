import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "out/webview",
    emptyOutDir: true,
    rollupOptions: {
      input: path.resolve(__dirname, "src/webview/index.html"),
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
      "@": path.resolve(__dirname, "src/webview"),
    },
  },
  css: {
    postcss: path.resolve(__dirname, "postcss.config.cjs"),
  },
});

