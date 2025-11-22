"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vite_1 = require("vite");
const plugin_react_1 = __importDefault(require("@vitejs/plugin-react"));
const path_1 = __importDefault(require("path"));
const url_1 = require("url");
exports.default = (0, vite_1.defineConfig)({
    plugins: [(0, plugin_react_1.default)()],
    build: {
        outDir: "out/webview",
        emptyOutDir: true,
        rollupOptions: {
            input: path_1.default.resolve(path_1.default.dirname((0, url_1.fileURLToPath)(import.meta.url)), "src/webview/index.html"),
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
            "@": path_1.default.resolve(path_1.default.dirname((0, url_1.fileURLToPath)(import.meta.url)), "src"),
        },
    },
});
//# sourceMappingURL=vite.config.js.map