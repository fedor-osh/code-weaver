import * as d3 from "d3";
import { ImportExportMap } from "./buildImportExportMap";
import { calculateNodeRelations } from "./calculateNodeRelations";
import { drawHighlightLines } from "./drawHighlightLines";

export interface DrawAllHighlightLinesOptions {
  container: d3.Selection<SVGGElement, unknown, null, undefined>;
  nodes: any[];
  allNodesMap: Map<string, any>;
  importExportMap: ImportExportMap;
}

export function drawAllHighlightLines(
  options: DrawAllHighlightLinesOptions
): d3.Selection<SVGGElement, unknown, null, undefined> | null {
  const { container, nodes, allNodesMap, importExportMap } = options;

  // Remove existing highlight groups
  container.selectAll(".highlight-lines").remove();

  // Create a single highlight group for all relations
  const highlight = container
    .append("g")
    .attr("class", "highlight-lines")
    .style("pointer-events", "none");

  // Track which lines we've already drawn to avoid duplicates
  const drawnLines = new Set<string>();

  // Helper function to create a unique key for a line
  const getLineKey = (fromId: string, toId: string) => {
    return `${fromId}-${toId}`;
  };

  // Iterate through all nodes and draw their relations
  nodes.forEach((node) => {
    if (!node.data?.id || node.x === undefined || node.y === undefined) {
      return;
    }

    const relations = calculateNodeRelations(node, importExportMap);
    const { targetNodeIds, intermediateNodes } = relations;

    if (targetNodeIds.size === 0 && intermediateNodes.size === 0) {
      return;
    }

    // Draw lines for this node's relations
    // We'll use the existing drawHighlightLines logic but accumulate into the same group
    if (node.data?.type === "export") {
      // Get the file that contains this export
      const exportInfo = importExportMap.exportIdToInfo.get(node.data.id);
      const fileContainingExport = exportInfo?.fileId;
      const reExportToFilesMap = importExportMap.exportToReExportToFiles?.get(
        node.data.id
      );

      if (intermediateNodes.size > 0) {
        // Group importing files by their intermediate node
        const filesByIntermediate = new Map<string, Set<string>>();
        
        targetNodeIds.forEach((importingFileId) => {
          // Check if this file imports through a re-exporting file
          let intermediateId: string | null = null;
          
          if (reExportToFilesMap) {
            reExportToFilesMap.forEach((importingFiles, reExportFileId) => {
              if (importingFiles.has(importingFileId) && intermediateNodes.has(reExportFileId)) {
                intermediateId = reExportFileId;
              }
            });
          }
          
          // If not through re-export, check if it goes through the file containing the export
          if (!intermediateId && fileContainingExport && intermediateNodes.has(fileContainingExport)) {
            intermediateId = fileContainingExport;
          }
          
          if (intermediateId) {
            if (!filesByIntermediate.has(intermediateId)) {
              filesByIntermediate.set(intermediateId, new Set());
            }
            filesByIntermediate.get(intermediateId)!.add(importingFileId);
          }
        });
        
        // Draw lines through intermediate nodes
        intermediateNodes.forEach((intermediateId) => {
          const intermediateNode = allNodesMap.get(intermediateId);
          if (
            !intermediateNode ||
            intermediateNode.x === undefined ||
            intermediateNode.y === undefined
          )
            return;

          // Check if this is a re-exporting file or the file containing the export
          const isReExportingFile = reExportToFilesMap ? reExportToFilesMap.has(intermediateId) : false;
          const isFileContainingExport = intermediateId === fileContainingExport;

          if (isReExportingFile || isFileContainingExport) {
            // Line from export to intermediate node
            const key1 = getLineKey(node.data.id, intermediateId);
            if (!drawnLines.has(key1)) {
              drawnLines.add(key1);
              highlight
                .append("line")
                .datum({ source: node, target: intermediateNode })
                .attr("x1", node.x)
                .attr("y1", node.y)
                .attr("x2", intermediateNode.x)
                .attr("y2", intermediateNode.y)
                .attr("stroke", "#ef4444")
                .attr("stroke-width", 2)
                .attr("stroke-opacity", 0.6)
                .attr("stroke-dasharray", "4,4")
                .attr("marker-end", "url(#arrowhead-red)")
                .style("filter", "drop-shadow(0 0 2px rgba(239, 68, 68, 0.36))");
            }

            // Draw lines from intermediate node to importing files
            const importingFiles = filesByIntermediate.get(intermediateId);
            if (importingFiles) {
              importingFiles.forEach((importingFileId) => {
                const importingFileNode = allNodesMap.get(importingFileId);
                if (
                  importingFileNode &&
                  importingFileNode.x !== undefined &&
                  importingFileNode.y !== undefined
                ) {
                  const key2 = getLineKey(intermediateId, importingFileId);
                  if (!drawnLines.has(key2)) {
                    drawnLines.add(key2);
                    highlight
                      .append("line")
                      .datum({
                        source: intermediateNode,
                        target: importingFileNode,
                      })
                      .attr("x1", intermediateNode.x)
                      .attr("y1", intermediateNode.y)
                      .attr("x2", importingFileNode.x)
                      .attr("y2", importingFileNode.y)
                      .attr("stroke", "#ef4444")
                      .attr("stroke-width", 2)
                      .attr("stroke-opacity", 0.6)
                      .attr("stroke-dasharray", "4,4")
                      .attr("marker-end", "url(#arrowhead-red)")
                      .style(
                        "filter",
                        "drop-shadow(0 0 2px rgba(239, 68, 68, 0.36))"
                      );
                  }
                }
              });
            }
          }
        });

        // Draw direct imports (files that import directly, not through any intermediate)
        targetNodeIds.forEach((targetId) => {
          // Check if this is a direct import (not through any intermediate)
          let isDirectImport = true;
          
          if (reExportToFilesMap) {
            reExportToFilesMap.forEach((importingFiles) => {
              if (importingFiles.has(targetId)) {
                isDirectImport = false;
              }
            });
          }
          
          if (isDirectImport && fileContainingExport && intermediateNodes.has(fileContainingExport)) {
            // Check if this file is in the filesByIntermediate for the file containing export
            const filesForFileContainingExport = filesByIntermediate.get(fileContainingExport);
            if (filesForFileContainingExport && filesForFileContainingExport.has(targetId)) {
              isDirectImport = false;
            }
          }

          if (isDirectImport) {
            const targetNode = allNodesMap.get(targetId);
            if (
              targetNode &&
              targetNode.x !== undefined &&
              targetNode.y !== undefined
            ) {
              const key = getLineKey(node.data.id, targetId);
              if (!drawnLines.has(key)) {
                drawnLines.add(key);
                highlight
                  .append("line")
                  .datum({ source: node, target: targetNode })
                  .attr("x1", node.x)
                  .attr("y1", node.y)
                  .attr("x2", targetNode.x)
                  .attr("y2", targetNode.y)
                  .attr("stroke", "#ef4444")
                  .attr("stroke-width", 2)
                  .attr("stroke-opacity", 0.8)
                  .attr("marker-end", "url(#arrowhead-red)")
                  .style(
                    "filter",
                    "drop-shadow(0 0 2px rgba(239, 68, 68, 0.48))"
                  );
              }
            }
          }
        });
      } else {
        // Direct imports only (no intermediates)
        targetNodeIds.forEach((targetId) => {
          const targetNode = allNodesMap.get(targetId);
          if (
            targetNode &&
            targetNode.x !== undefined &&
            targetNode.y !== undefined
          ) {
            const key = getLineKey(node.data.id, targetId);
            if (!drawnLines.has(key)) {
              drawnLines.add(key);
              highlight
                .append("line")
                .datum({ source: node, target: targetNode })
                .attr("x1", node.x)
                .attr("y1", node.y)
                .attr("x2", targetNode.x)
                .attr("y2", targetNode.y)
                .attr("stroke", "#ef4444")
                .attr("stroke-width", 2)
                .attr("stroke-opacity", 0.8)
                .attr("marker-end", "url(#arrowhead-red)")
                .style(
                  "filter",
                  "drop-shadow(0 0 2px rgba(239, 68, 68, 0.48))"
                );
            }
          }
        });
      }
    } else if (node.data?.type === "file") {
      if (intermediateNodes.size > 0) {
        // Group exports by their intermediate node
        const exportsByIntermediate = new Map<string, Set<string>>();
        
        targetNodeIds.forEach((exportId) => {
          // Check if this export goes through a re-exporting file
          const reExportToFilesMap = importExportMap.exportToReExportToFiles?.get(exportId);
          let intermediateId: string | null = null;
          
          if (reExportToFilesMap) {
            // Check if any re-exporting file is in intermediateNodes and imports this file
            reExportToFilesMap.forEach((importingFiles, reExportFileId) => {
              if (intermediateNodes.has(reExportFileId) && importingFiles.has(node.data.id)) {
                intermediateId = reExportFileId;
              }
            });
          }
          
          // If not through re-export, check if the file containing the export is an intermediate
          if (!intermediateId) {
            const exportInfo = importExportMap.exportIdToInfo.get(exportId);
            if (exportInfo && intermediateNodes.has(exportInfo.fileId)) {
              intermediateId = exportInfo.fileId;
            }
          }
          
          if (intermediateId) {
            if (!exportsByIntermediate.has(intermediateId)) {
              exportsByIntermediate.set(intermediateId, new Set());
            }
            exportsByIntermediate.get(intermediateId)!.add(exportId);
          }
        });
        
        // Draw lines through intermediate nodes
        intermediateNodes.forEach((intermediateId) => {
          const intermediateNode = allNodesMap.get(intermediateId);
          if (
            !intermediateNode ||
            intermediateNode.x === undefined ||
            intermediateNode.y === undefined
          )
            return;

          // Line from file to intermediate node
          const key1 = getLineKey(node.data.id, intermediateId);
          if (!drawnLines.has(key1)) {
            drawnLines.add(key1);
            highlight
              .append("line")
              .datum({ source: node, target: intermediateNode })
              .attr("x1", node.x)
              .attr("y1", node.y)
              .attr("x2", intermediateNode.x)
              .attr("y2", intermediateNode.y)
              .attr("stroke", "#ef4444")
              .attr("stroke-width", 2)
              .attr("stroke-opacity", 0.6)
              .attr("stroke-dasharray", "4,4")
              .attr("marker-end", "url(#arrowhead-red)")
              .style("filter", "drop-shadow(0 0 2px rgba(239, 68, 68, 0.36))");
          }

          // Draw lines from intermediate node to exports
          const exports = exportsByIntermediate.get(intermediateId);
          if (exports) {
            exports.forEach((exportId) => {
              const exportNode = allNodesMap.get(exportId);
              if (
                exportNode &&
                exportNode.x !== undefined &&
                exportNode.y !== undefined
              ) {
                const key2 = getLineKey(intermediateId, exportId);
                if (!drawnLines.has(key2)) {
                  drawnLines.add(key2);
                  highlight
                    .append("line")
                    .datum({ source: intermediateNode, target: exportNode })
                    .attr("x1", intermediateNode.x)
                    .attr("y1", intermediateNode.y)
                    .attr("x2", exportNode.x)
                    .attr("y2", exportNode.y)
                    .attr("stroke", "#ef4444")
                    .attr("stroke-width", 2)
                    .attr("stroke-opacity", 0.6)
                    .attr("stroke-dasharray", "4,4")
                    .attr("marker-end", "url(#arrowhead-red)")
                    .style(
                      "filter",
                      "drop-shadow(0 0 2px rgba(239, 68, 68, 0.36))"
                    );
                }
              }
            });
          }
        });

        // Draw direct imports (exports imported directly, not through any intermediate)
        targetNodeIds.forEach((targetId) => {
          const reExportToFilesMap =
            importExportMap.exportToReExportToFiles?.get(targetId);
          const exportInfo = importExportMap.exportIdToInfo.get(targetId);
          
          let isDirectImport = true;
          
          // Check if it goes through a re-exporting file
          if (reExportToFilesMap) {
            reExportToFilesMap.forEach((importingFiles) => {
              if (importingFiles.has(node.data.id)) {
                isDirectImport = false;
              }
            });
          }
          
          // Check if it goes through the file containing the export
          if (isDirectImport && exportInfo && intermediateNodes.has(exportInfo.fileId)) {
            isDirectImport = false;
          }

          if (isDirectImport) {
            const targetNode = allNodesMap.get(targetId);
            if (
              targetNode &&
              targetNode.x !== undefined &&
              targetNode.y !== undefined
            ) {
              const key = getLineKey(node.data.id, targetId);
              if (!drawnLines.has(key)) {
                drawnLines.add(key);
                highlight
                  .append("line")
                  .datum({ source: node, target: targetNode })
                  .attr("x1", node.x)
                  .attr("y1", node.y)
                  .attr("x2", targetNode.x)
                  .attr("y2", targetNode.y)
                  .attr("stroke", "#ef4444")
                  .attr("stroke-width", 2)
                  .attr("stroke-opacity", 0.8)
                  .attr("marker-end", "url(#arrowhead-red)")
                  .style(
                    "filter",
                    "drop-shadow(0 0 2px rgba(239, 68, 68, 0.48))"
                  );
              }
            }
          }
        });
      } else {
        // Direct imports only (no intermediates)
        targetNodeIds.forEach((targetId) => {
          const targetNode = allNodesMap.get(targetId);
          if (
            targetNode &&
            targetNode.x !== undefined &&
            targetNode.y !== undefined
          ) {
            const key = getLineKey(node.data.id, targetId);
            if (!drawnLines.has(key)) {
              drawnLines.add(key);
              highlight
                .append("line")
                .datum({ source: node, target: targetNode })
                .attr("x1", node.x)
                .attr("y1", node.y)
                .attr("x2", targetNode.x)
                .attr("y2", targetNode.y)
                .attr("stroke", "#ef4444")
                .attr("stroke-width", 2)
                .attr("stroke-opacity", 0.8)
                .attr("marker-end", "url(#arrowhead-red)")
                .style(
                  "filter",
                  "drop-shadow(0 0 2px rgba(239, 68, 68, 0.48))"
                );
            }
          }
        });
      }
    }
  });

  return highlight;
}
