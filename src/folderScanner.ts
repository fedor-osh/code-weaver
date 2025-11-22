import * as fs from "fs";
import * as path from "path";
import { parseModule, ImportInfo, ExportInfo } from "./moduleParser";

export type FileLanguage = "ts" | "tsx" | "js" | "jsx";

export interface FileStructure {
  name: string;
  path: string;
  type: "file" | "folder";
  language?: FileLanguage;
  imports?: ImportInfo[];
  exports?: ExportInfo[];
  children?: FileStructure[];
}

function getFileLanguage(fileName: string): FileLanguage | undefined {
  const ext = path.extname(fileName).toLowerCase();
  const extension = ext.startsWith(".") ? ext.slice(1) : ext;

  if (extension === "tsx") {
    return "tsx";
  }

  if (extension === "ts") {
    return "ts";
  }

  if (extension === "jsx") {
    return "jsx";
  }

  if (extension === "js" || extension === "mjs" || extension === "cjs") {
    return "js";
  }

  return undefined;
}

export function getFolderStructure(rootPath: string): FileStructure {
  const rootName = path.basename(rootPath);
  const normalizedRootPath = path.resolve(rootPath);

  function scanDirectory(dirPath: string, dirName: string): FileStructure {
    const fullPath = path.join(dirPath, dirName);
    const stats = fs.statSync(fullPath);
    const relativePath = path
      .relative(normalizedRootPath, fullPath)
      .replace(/\\/g, "/");

    if (stats.isFile()) {
      const language = getFileLanguage(dirName);
      const fileStructure: FileStructure = {
        name: dirName,
        path: relativePath,
        type: "file",
      };

      if (language) {
        fileStructure.language = language;

        // Parse module for imports and exports
        try {
          const moduleInfo = parseModule(fullPath);
          if (moduleInfo) {
            if (moduleInfo.imports.length > 0) {
              fileStructure.imports = moduleInfo.imports;
            }
            if (moduleInfo.exports.length > 0) {
              fileStructure.exports = moduleInfo.exports;
            }
          }
        } catch (error) {
          // Silently fail if parsing fails
        }
      }

      return fileStructure;
    }

    if (stats.isDirectory()) {
      const children: FileStructure[] = [];
      const entries = fs.readdirSync(fullPath);

      for (const entry of entries) {
        // Skip common ignored directories and files
        if (shouldIgnore(entry)) {
          continue;
        }

        try {
          const childPath = path.join(fullPath, entry);
          const childStats = fs.statSync(childPath);

          if (childStats.isDirectory() || childStats.isFile()) {
            children.push(scanDirectory(fullPath, entry));
          }
        } catch (error) {
          // Skip files/directories that can't be accessed
          continue;
        }
      }

      // Sort: folders first, then files, both alphabetically
      children.sort((a, b) => {
        if (a.type !== b.type) {
          return a.type === "folder" ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
      });

      return {
        name: dirName,
        path: relativePath,
        type: "folder",
        children,
      };
    }

    return {
      name: dirName,
      path: relativePath,
      type: "file",
    };
  }

  return scanDirectory(path.dirname(rootPath), rootName);
}

function shouldIgnore(name: string): boolean {
  const ignorePatterns = [
    "node_modules",
    ".git",
    ".vscode",
    ".DS_Store",
    "dist",
    "build",
    "out",
    ".next",
    ".cache",
    ".vscode-test",
  ];

  return ignorePatterns.includes(name);
}
