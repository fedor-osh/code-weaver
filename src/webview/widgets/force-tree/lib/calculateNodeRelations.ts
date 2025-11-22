import { ImportExportMap } from "./buildImportExportMap";

export interface NodeRelations {
  targetNodeIds: Set<string>;
  intermediateNodes: Set<string>;
}

export function calculateNodeRelations(
  node: any,
  importExportMap: ImportExportMap
): NodeRelations {
  const nodeId = node.data.id;
  let targetNodeIds: Set<string> = new Set();
  let intermediateNodes: Set<string> = new Set();

  if (node.data.type === "export") {
    // If it's an export node, find all files that import it (directly or through re-exports)
    const files = importExportMap.exportToFiles.get(nodeId);
    if (files) {
      // Check if there are re-exporting files and track which files import through which re-exporting file
      const reExportToFilesMap = importExportMap.exportToReExportToFiles?.get(nodeId);
      if (reExportToFilesMap && reExportToFilesMap.size > 0) {
        // For each re-exporting file, add it as intermediate and track files that import through it
        reExportToFilesMap.forEach((importingFiles, reExportFileId) => {
          intermediateNodes.add(reExportFileId);
          importingFiles.forEach((fileId) => targetNodeIds.add(fileId));
        });
        // Also add direct imports (files that don't import through re-exports)
        files.forEach((fileId) => {
          // Check if this file imports through any re-exporting file
          let importsThroughReExport = false;
          reExportToFilesMap.forEach((importingFiles) => {
            if (importingFiles.has(fileId)) {
              importsThroughReExport = true;
            }
          });
          if (!importsThroughReExport) {
            targetNodeIds.add(fileId);
          }
        });
      } else {
        // Direct imports only
        files.forEach((fileId) => targetNodeIds.add(fileId));
      }
    }
  } else if (node.data.type === "file") {
    // If it's a file node, find all exports it imports
    const exports = importExportMap.fileToExports.get(nodeId);
    if (exports) {
      exports.forEach((exportId) => {
        // Check if this export is imported through a re-exporting file
        const reExportToFilesMap = importExportMap.exportToReExportToFiles?.get(exportId);
        if (reExportToFilesMap && reExportToFilesMap.size > 0) {
          // Find which re-exporting file this file imports through
          let foundReExportFile: string | null = null;
          reExportToFilesMap.forEach((importingFiles, reExportFileId) => {
            if (importingFiles.has(nodeId)) {
              foundReExportFile = reExportFileId;
            }
          });
          
          if (foundReExportFile) {
            // This file imports through a re-exporting file
            intermediateNodes.add(foundReExportFile);
            targetNodeIds.add(exportId);
          } else {
            // Direct import (not through re-export)
            // For leaf exports, route through the file containing the export
            const exportInfo = importExportMap.exportIdToInfo.get(exportId);
            if (exportInfo) {
              intermediateNodes.add(exportInfo.fileId);
              targetNodeIds.add(exportId);
            } else {
              targetNodeIds.add(exportId);
            }
          }
        } else {
          // Direct import (no re-exports)
          // For leaf exports, route through the file containing the export
          const exportInfo = importExportMap.exportIdToInfo.get(exportId);
          if (exportInfo) {
            intermediateNodes.add(exportInfo.fileId);
            targetNodeIds.add(exportId);
          } else {
            targetNodeIds.add(exportId);
          }
        }
      });
    }
  }

  return { targetNodeIds, intermediateNodes };
}

