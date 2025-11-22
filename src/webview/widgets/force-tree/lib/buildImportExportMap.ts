import { FileStructureWithId } from "./addIds";

export interface ImportExportRelationship {
  fileId: string;
  exportId: string;
  importName: string;
}

export interface ImportExportMap {
  // Map from export ID to files that import it
  exportToFiles: Map<string, Set<string>>;
  // Map from file ID to exports it imports
  fileToExports: Map<string, Set<string>>;
  // Map from file path to file ID
  filePathToId: Map<string, string>;
  // Map from export ID to export info
  exportIdToInfo: Map<
    string,
    { name: string; fileId: string; isDefault: boolean }
  >;
  // Map from file ID to re-export information (file it re-exports from)
  reExports: Map<string, { from: string; exportNames?: string[] }[]>;
  // Map from export ID to files that re-export it (intermediate files)
  exportToReExportFiles: Map<string, Set<string>>;
  // Map from re-exporting file ID to original export IDs it re-exports
  reExportFileToExports: Map<string, Set<string>>;
}

/**
 * Resolves a relative import path to a file path that can be matched
 */
function resolveImportPath(
  fromPath: string,
  currentFilePath: string
): string[] {
  const candidates: string[] = [];

  // Remove file extension from current file
  const currentDir = currentFilePath.split("/").slice(0, -1).join("/");
  const currentFileBase = currentFilePath.replace(/\.(ts|tsx|js|jsx)$/, "");

  let resolved = fromPath;

  // Handle relative paths
  if (fromPath.startsWith("./")) {
    resolved = `${currentDir}/${fromPath.slice(2)}`;
  } else if (fromPath.startsWith("../")) {
    const parts = currentDir.split("/").filter((p) => p);
    let upLevels = 0;
    let remaining = fromPath;
    while (remaining.startsWith("../")) {
      upLevels++;
      remaining = remaining.slice(3);
    }
    if (upLevels < parts.length) {
      resolved = `${parts.slice(0, -upLevels).join("/")}/${remaining}`;
    } else {
      return candidates; // Invalid path
    }
  } else {
    // Absolute path from root (remove leading slash if present)
    resolved = fromPath.startsWith("/") ? fromPath.slice(1) : fromPath;
  }

  // Normalize path separators
  resolved = resolved.replace(/\\/g, "/");

  // Try with and without common extensions and index files
  const extensions = ["", ".ts", ".tsx", ".js", ".jsx"];
  for (const ext of extensions) {
    candidates.push(`${resolved}${ext}`);
    candidates.push(`${resolved}/index${ext}`);
  }

  return candidates;
}

/**
 * Normalizes a file path for matching (removes extensions, handles index files)
 */
function normalizePathForMatching(path: string): string[] {
  const normalized: string[] = [];

  // Remove extension
  const withoutExt = path.replace(/\.(ts|tsx|js|jsx)$/, "");
  normalized.push(withoutExt);

  // If it's an index file, also try without /index
  if (withoutExt.endsWith("/index")) {
    normalized.push(withoutExt.replace(/\/index$/, ""));
  }

  return normalized;
}

/**
 * Builds a map of import/export relationships
 */
export function buildImportExportMap(
  structure: FileStructureWithId,
  allFiles: Map<string, FileStructureWithId> = new Map(),
  allExports: Map<
    string,
    { id: string; name: string; fileId: string; isDefault: boolean }
  > = new Map(),
  currentPath: string = ""
): ImportExportMap {
  const map: ImportExportMap = {
    exportToFiles: new Map(),
    fileToExports: new Map(),
    filePathToId: new Map(),
    exportIdToInfo: new Map(),
    reExports: new Map(),
    exportToReExportFiles: new Map(),
    reExportFileToExports: new Map(),
  };

  // First pass: collect all files and exports
  function collectFilesAndExports(fs: FileStructureWithId, path: string = "") {
    const filePath = path ? `${path}/${fs.name}` : fs.name;

    if (fs.type === "file") {
      allFiles.set(filePath, fs);
      map.filePathToId.set(filePath, fs.id);

      // Collect exports from this file
      if (fs.exports) {
        const reExports: { from: string; exportNames?: string[] }[] = [];

        fs.exports.forEach((exp) => {
          // Check if this is a re-export (format: "from './path'" or "from '../path'")
          if (exp.name.startsWith("from '") && exp.name.endsWith("'")) {
            const fromPath = exp.name.slice(6, -1); // Remove "from '" and "'"
            const exportNames = exp.name.includes(" as ")
              ? [exp.name.split(" as ")[1]]
              : undefined;
            reExports.push({ from: fromPath, exportNames });
          } else {
            // Regular export
            const exportId = `${fs.id}-export-${exp.name}`;
            allExports.set(exportId, {
              id: exportId,
              name: exp.name,
              fileId: fs.id,
              isDefault: exp.isDefault || false,
            });
            map.exportIdToInfo.set(exportId, {
              name: exp.name,
              fileId: fs.id,
              isDefault: exp.isDefault || false,
            });
          }
        });

        if (reExports.length > 0) {
          map.reExports.set(fs.id, reExports);
        }
      }
    }

    if (fs.children) {
      fs.children.forEach((child) => {
        collectFilesAndExports(child, filePath);
      });
    }
  }

  collectFilesAndExports(structure);

  // Second pass: build relationships
  function buildRelationships(fs: FileStructureWithId, path: string = "") {
    const filePath = path ? `${path}/${fs.name}` : fs.name;

    if (fs.type === "file" && fs.imports) {
      const fileExports = new Set<string>();

      fs.imports.forEach((imp) => {
        const candidatePaths = resolveImportPath(imp.from, filePath);
        if (candidatePaths.length === 0) return;

        // Try to find matching file
        let importedFile: FileStructureWithId | undefined;
        for (const candidatePath of candidatePaths) {
          // Try exact match first
          importedFile = allFiles.get(candidatePath);
          if (importedFile) break;

          // Try normalized paths
          const normalizedCandidates = normalizePathForMatching(candidatePath);
          for (const normalized of normalizedCandidates) {
            for (const [filePath, file] of allFiles.entries()) {
              const normalizedFilePath = normalizePathForMatching(filePath);
              if (normalizedFilePath.includes(normalized)) {
                importedFile = file;
                break;
              }
            }
            if (importedFile) break;
          }
          if (importedFile) break;
        }

        if (!importedFile || !importedFile.exports) return;

        const importedExports = importedFile.exports;

        // Match imported names with exports
        imp.imports.forEach((importName) => {
          // Handle default imports
          if (importName === "default" || importName.startsWith("default")) {
            importedExports.forEach((exp) => {
              if (exp.isDefault) {
                const exportId = `${importedFile.id}-export-${exp.name}`;
                fileExports.add(exportId);

                if (!map.exportToFiles.has(exportId)) {
                  map.exportToFiles.set(exportId, new Set());
                }
                map.exportToFiles.get(exportId)!.add(fs.id);
              }
            });
          } else {
            // Handle named imports (may have alias: "original as alias")
            const actualImportName = importName.includes(" as ")
              ? importName.split(" as ")[0]
              : importName;

            // First, check for re-exports
            const hasReExport = importedExports.some((exp) =>
              exp.name.startsWith("from '")
            );

            if (hasReExport) {
              // Handle re-exports - check all re-exported files
              importedExports.forEach((exp) => {
                if (exp.name.startsWith("from '")) {
                  const reExportPath = exp.name.slice(6, -1); // Remove "from '" and "'"
                  const reExportCandidates = resolveImportPath(
                    reExportPath,
                    filePath
                  );

                  let sourceFile: FileStructureWithId | undefined;
                  for (const candidatePath of reExportCandidates) {
                    sourceFile = allFiles.get(candidatePath);
                    if (sourceFile) break;

                    const normalizedCandidates =
                      normalizePathForMatching(candidatePath);
                    for (const normalized of normalizedCandidates) {
                      for (const [fp, file] of allFiles.entries()) {
                        const normalizedFilePath = normalizePathForMatching(fp);
                        if (normalizedFilePath.includes(normalized)) {
                          sourceFile = file;
                          break;
                        }
                      }
                      if (sourceFile) break;
                    }
                    if (sourceFile) break;
                  }

                  if (sourceFile && sourceFile.exports) {
                    // Check all exports from source file to see if any match the import
                    sourceFile.exports.forEach((sourceExp) => {
                      // Skip nested re-exports for now
                      if (sourceExp.name.startsWith("from '")) return;

                      // Check if this export matches what we're importing
                      const matches =
                        sourceExp.name === actualImportName ||
                        sourceExp.name === importName ||
                        (sourceExp.isDefault &&
                          (importName === "default" ||
                            importName.startsWith("default")));

                      if (matches) {
                        const sourceExportId = `${sourceFile.id}-export-${sourceExp.name}`;
                        fileExports.add(sourceExportId);

                        if (!map.exportToFiles.has(sourceExportId)) {
                          map.exportToFiles.set(sourceExportId, new Set());
                        }
                        map.exportToFiles.get(sourceExportId)!.add(fs.id);
                      }
                    });
                  }
                }
              });
            } else {
              // No re-exports, check regular exports
              importedExports.forEach((exp) => {
                if (exp.name === actualImportName || exp.name === importName) {
                  const exportId = `${importedFile.id}-export-${exp.name}`;
                  fileExports.add(exportId);

                  if (!map.exportToFiles.has(exportId)) {
                    map.exportToFiles.set(exportId, new Set());
                  }
                  map.exportToFiles.get(exportId)!.add(fs.id);
                }
              });
            }
          }
        });
      });

      if (fileExports.size > 0) {
        map.fileToExports.set(fs.id, fileExports);
      }
    }

    if (fs.children) {
      fs.children.forEach((child) => {
        buildRelationships(child, filePath);
      });
    }
  }

  buildRelationships(structure);

  // Third pass: handle re-exports - link original exports through re-exporting files
  function processReExports(fs: FileStructureWithId, path: string = "") {
    const filePath = path ? `${path}/${fs.name}` : fs.name;

    if (fs.type === "file") {
      const reExports = map.reExports.get(fs.id);
      if (reExports) {
        reExports.forEach((reExport) => {
          const candidatePaths = resolveImportPath(reExport.from, filePath);

          // Find the source file being re-exported
          let sourceFile: FileStructureWithId | undefined;
          for (const candidatePath of candidatePaths) {
            sourceFile = allFiles.get(candidatePath);
            if (sourceFile) break;

            const normalizedCandidates =
              normalizePathForMatching(candidatePath);
            for (const normalized of normalizedCandidates) {
              for (const [fp, file] of allFiles.entries()) {
                const normalizedFilePath = normalizePathForMatching(fp);
                if (normalizedFilePath.includes(normalized)) {
                  sourceFile = file;
                  break;
                }
              }
              if (sourceFile) break;
            }
            if (sourceFile) break;
          }

          if (!sourceFile || !sourceFile.exports) return;

          // For each export in the source file, create a re-export relationship
          sourceFile.exports.forEach((sourceExp) => {
            // Skip re-exports in source file
            if (sourceExp.name.startsWith("from '")) return;

            // If specific export names are specified, only process those
            if (reExport.exportNames && reExport.exportNames.length > 0) {
              const matches = reExport.exportNames.some((name) => {
                // Handle aliases: "original as alias"
                if (name.includes(" as ")) {
                  const originalName = name.split(" as ")[0];
                  return sourceExp.name === originalName;
                }
                return sourceExp.name === name;
              });
              if (!matches) return;
            }

            const sourceExportId = `${sourceFile.id}-export-${sourceExp.name}`;
            const reExportId = `${fs.id}-export-${sourceExp.name}`;

            // Create the re-export entry
            map.exportIdToInfo.set(reExportId, {
              name: sourceExp.name,
              fileId: fs.id,
              isDefault: sourceExp.isDefault || false,
            });

            // Link: files importing from re-exporting file should also link to original export
            // Find all files that import from the re-exporting file
            const importingFiles = map.fileToExports.get(fs.id);
            if (importingFiles) {
              // This will be populated in the next step
            }

            // Also link original export to re-exporting file
            if (!map.exportToFiles.has(sourceExportId)) {
              map.exportToFiles.set(sourceExportId, new Set());
            }
            map.exportToFiles.get(sourceExportId)!.add(fs.id);
          });
        });
      }
    }

    if (fs.children) {
      fs.children.forEach((child) => {
        processReExports(child, filePath);
      });
    }
  }

  processReExports(structure);

  // Fourth pass: link re-exported items to their final importers
  function linkReExportsToImporters(
    fs: FileStructureWithId,
    path: string = ""
  ) {
    const filePath = path ? `${path}/${fs.name}` : fs.name;

    if (fs.type === "file" && fs.imports) {
      fs.imports.forEach((imp) => {
        const candidatePaths = resolveImportPath(imp.from, filePath);

        let importedFile: FileStructureWithId | undefined;
        for (const candidatePath of candidatePaths) {
          importedFile = allFiles.get(candidatePath);
          if (importedFile) break;

          const normalizedCandidates = normalizePathForMatching(candidatePath);
          for (const normalized of normalizedCandidates) {
            for (const [fp, file] of allFiles.entries()) {
              const normalizedFilePath = normalizePathForMatching(fp);
              if (normalizedFilePath.includes(normalized)) {
                importedFile = file;
                break;
              }
            }
            if (importedFile) break;
          }
          if (importedFile) break;
        }

        if (!importedFile) return;

        // Check if this file has re-exports
        const reExports = map.reExports.get(importedFile.id);

        imp.imports.forEach((importName) => {
          const actualImportName = importName.includes(" as ")
            ? importName.split(" as ")[0]
            : importName;

          // Check if this import matches a re-exported item
          if (reExports) {
            reExports.forEach((reExport) => {
              const candidatePaths = resolveImportPath(
                reExport.from,
                importedFile!.name
              );

              let sourceFile: FileStructureWithId | undefined;
              for (const candidatePath of candidatePaths) {
                sourceFile = allFiles.get(candidatePath);
                if (sourceFile) break;

                const normalizedCandidates =
                  normalizePathForMatching(candidatePath);
                for (const normalized of normalizedCandidates) {
                  for (const [fp, file] of allFiles.entries()) {
                    const normalizedFilePath = normalizePathForMatching(fp);
                    if (normalizedFilePath.includes(normalized)) {
                      sourceFile = file;
                      break;
                    }
                  }
                  if (sourceFile) break;
                }
                if (sourceFile) break;
              }

              if (!sourceFile || !sourceFile.exports) return;

              sourceFile.exports.forEach((sourceExp) => {
                if (sourceExp.name.startsWith("from '")) return;

                // Check if this export matches the import
                const matches =
                  reExport.exportNames === undefined ||
                  reExport.exportNames.length === 0 ||
                  reExport.exportNames.some((name) => {
                    const originalName = name.includes(" as ")
                      ? name.split(" as ")[0]
                      : name;
                    return sourceExp.name === originalName;
                  });

                if (
                  matches &&
                  (sourceExp.name === actualImportName ||
                    (sourceExp.isDefault && importName === "default"))
                ) {
                  const sourceExportId = `${sourceFile.id}-export-${sourceExp.name}`;

                  if (!map.exportToFiles.has(sourceExportId)) {
                    map.exportToFiles.set(sourceExportId, new Set());
                  }
                  map.exportToFiles.get(sourceExportId)!.add(fs.id);

                  // Also add to fileToExports
                  if (!map.fileToExports.has(fs.id)) {
                    map.fileToExports.set(fs.id, new Set());
                  }
                  map.fileToExports.get(fs.id)!.add(sourceExportId);
                }
              });
            });
          }
        });
      });
    }

    if (fs.children) {
      fs.children.forEach((child) => {
        linkReExportsToImporters(child, filePath);
      });
    }
  }

  linkReExportsToImporters(structure);

  return map;
}
