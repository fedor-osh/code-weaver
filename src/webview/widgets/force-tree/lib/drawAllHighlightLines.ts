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
      const reExportToFilesMap = importExportMap.exportToReExportToFiles?.get(
        node.data.id
      );

      if (intermediateNodes.size > 0) {
        // Draw lines through re-exporting files
        intermediateNodes.forEach((reExportFileId) => {
          const reExportFileNode = allNodesMap.get(reExportFileId);
          if (
            !reExportFileNode ||
            reExportFileNode.x === undefined ||
            reExportFileNode.y === undefined
          )
            return;

          // Line from export to re-exporting file
          const key1 = getLineKey(node.data.id, reExportFileId);
          if (!drawnLines.has(key1)) {
            drawnLines.add(key1);
            highlight
              .append("line")
              .datum({ source: node, target: reExportFileNode })
              .attr("x1", node.x)
              .attr("y1", node.y)
              .attr("x2", reExportFileNode.x)
              .attr("y2", reExportFileNode.y)
              .attr("stroke", "#ef4444")
              .attr("stroke-width", 2)
              .attr("stroke-opacity", 0.6)
              .attr("stroke-dasharray", "4,4")
              .attr("marker-end", "url(#arrowhead-red)")
              .style("filter", "drop-shadow(0 0 2px rgba(239, 68, 68, 0.36))");
          }

          // Find files that import this export through THIS specific re-exporting file
          if (reExportToFilesMap) {
            const importingFiles = reExportToFilesMap.get(reExportFileId);
            if (importingFiles) {
              importingFiles.forEach((importingFileId) => {
                const importingFileNode = allNodesMap.get(importingFileId);
                if (
                  importingFileNode &&
                  importingFileNode.x !== undefined &&
                  importingFileNode.y !== undefined
                ) {
                  const key2 = getLineKey(reExportFileId, importingFileId);
                  if (!drawnLines.has(key2)) {
                    drawnLines.add(key2);
                    highlight
                      .append("line")
                      .datum({
                        source: reExportFileNode,
                        target: importingFileNode,
                      })
                      .attr("x1", reExportFileNode.x)
                      .attr("y1", reExportFileNode.y)
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

        // Draw direct imports (files that import directly, not through re-exports)
        targetNodeIds.forEach((targetId) => {
          let isDirectImport = true;
          if (reExportToFilesMap) {
            reExportToFilesMap.forEach((importingFiles) => {
              if (importingFiles.has(targetId)) {
                isDirectImport = false;
              }
            });
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
        // Direct imports only (no re-exports)
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
        // Draw lines through re-exporting files
        intermediateNodes.forEach((reExportFileId) => {
          const reExportFileNode = allNodesMap.get(reExportFileId);
          if (
            !reExportFileNode ||
            reExportFileNode.x === undefined ||
            reExportFileNode.y === undefined
          )
            return;

          // Line from file to re-exporting file
          const key1 = getLineKey(node.data.id, reExportFileId);
          if (!drawnLines.has(key1)) {
            drawnLines.add(key1);
            highlight
              .append("line")
              .datum({ source: node, target: reExportFileNode })
              .attr("x1", node.x)
              .attr("y1", node.y)
              .attr("x2", reExportFileNode.x)
              .attr("y2", reExportFileNode.y)
              .attr("stroke", "#ef4444")
              .attr("stroke-width", 2)
              .attr("stroke-opacity", 0.6)
              .attr("stroke-dasharray", "4,4")
              .attr("marker-end", "url(#arrowhead-red)")
              .style("filter", "drop-shadow(0 0 2px rgba(239, 68, 68, 0.36))");
          }

          // Find exports that this file imports through THIS specific re-exporting file
          targetNodeIds.forEach((exportId) => {
            const reExportToFilesMap =
              importExportMap.exportToReExportToFiles?.get(exportId);
            if (reExportToFilesMap) {
              const importingFiles = reExportToFilesMap.get(reExportFileId);
              if (importingFiles && importingFiles.has(node.data.id)) {
                const exportNode = allNodesMap.get(exportId);
                if (
                  exportNode &&
                  exportNode.x !== undefined &&
                  exportNode.y !== undefined
                ) {
                  const key2 = getLineKey(reExportFileId, exportId);
                  if (!drawnLines.has(key2)) {
                    drawnLines.add(key2);
                    highlight
                      .append("line")
                      .datum({ source: reExportFileNode, target: exportNode })
                      .attr("x1", reExportFileNode.x)
                      .attr("y1", reExportFileNode.y)
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
              }
            }
          });
        });

        // Draw direct imports (exports imported directly, not through re-exports)
        targetNodeIds.forEach((targetId) => {
          const reExportToFilesMap =
            importExportMap.exportToReExportToFiles?.get(targetId);
          let isDirectImport = true;
          if (reExportToFilesMap) {
            reExportToFilesMap.forEach((importingFiles) => {
              if (importingFiles.has(node.data.id)) {
                isDirectImport = false;
              }
            });
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
        // Direct imports only (no re-exports)
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
