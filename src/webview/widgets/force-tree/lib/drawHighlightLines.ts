import * as d3 from "d3";
import { ImportExportMap } from "./buildImportExportMap";

export interface DrawHighlightLinesOptions {
  container: d3.Selection<SVGGElement, unknown, null, undefined>;
  sourceNode: any;
  targetNodeIds: Set<string>;
  intermediateNodes?: Set<string>;
  allNodes: Map<string, any>;
  highlightGroup: d3.Selection<SVGGElement, unknown, null, undefined> | null;
  importExportMap?: ImportExportMap;
}

export function drawHighlightLines(
  options: DrawHighlightLinesOptions
): d3.Selection<SVGGElement, unknown, null, undefined> {
  const {
    container,
    sourceNode,
    targetNodeIds,
    intermediateNodes = new Set(),
    allNodes,
    highlightGroup,
    importExportMap,
  } = options;

  // Remove existing highlight group
  if (highlightGroup) {
    highlightGroup.remove();
  }

  // Create new highlight group
  const highlight = container
    .append("g")
    .attr("class", "highlight-lines")
    .style("pointer-events", "none");

  if (!sourceNode || sourceNode.x === undefined || sourceNode.y === undefined) {
    return highlight;
  }

  // Helper function to draw a line
  const drawLine = (
    from: any,
    to: any,
    isDashed: boolean = false,
    opacity: number = 0.8
  ) => {
    if (!to || to.x === undefined || to.y === undefined) return;
    highlight
      .append("line")
      .datum({ source: from, target: to })
      .attr("x1", from.x)
      .attr("y1", from.y)
      .attr("x2", to.x)
      .attr("y2", to.y)
      .attr("stroke", "#ef4444")
      .attr("stroke-width", 2)
      .attr("stroke-opacity", opacity)
      .attr("stroke-dasharray", isDashed ? "4,4" : null)
      .attr("marker-end", "url(#arrowhead-red)")
      .style("filter", `drop-shadow(0 0 2px rgba(239, 68, 68, ${opacity * 0.6}))`);
  };

  if (sourceNode.data?.type === "export") {
    // Case 1: Hovering over an export node
    // Show: export -> re-exporting files -> importing files
    
    if (intermediateNodes.size > 0) {
      // Draw lines through re-exporting files
      const reExportToFilesMap = importExportMap?.exportToReExportToFiles?.get(sourceNode.data.id);
      
      intermediateNodes.forEach((reExportFileId) => {
        const reExportFileNode = allNodes.get(reExportFileId);
        if (!reExportFileNode) return;

        // Line from export to re-exporting file
        drawLine(sourceNode, reExportFileNode, true, 0.6);

        // Find files that import this export through THIS specific re-exporting file
        if (reExportToFilesMap) {
          const importingFiles = reExportToFilesMap.get(reExportFileId);
          if (importingFiles) {
            importingFiles.forEach((importingFileId) => {
              const importingFileNode = allNodes.get(importingFileId);
              if (importingFileNode) {
                // Line from re-exporting file to importing file
                drawLine(reExportFileNode, importingFileNode, true, 0.6);
              }
            });
          }
        }
      });
      
      // Draw direct imports (files that import directly, not through re-exports)
      targetNodeIds.forEach((targetId) => {
        // Check if this is a direct import (not through any re-export)
        let isDirectImport = true;
        if (reExportToFilesMap) {
          reExportToFilesMap.forEach((importingFiles) => {
            if (importingFiles.has(targetId)) {
              isDirectImport = false;
            }
          });
        }
        
        if (isDirectImport) {
          const targetNode = allNodes.get(targetId);
          drawLine(sourceNode, targetNode, false, 0.8);
        }
      });
    } else {
      // Direct imports only (no re-exports)
      targetNodeIds.forEach((targetId) => {
        const targetNode = allNodes.get(targetId);
        drawLine(sourceNode, targetNode, false, 0.8);
      });
    }
  } else if (sourceNode.data?.type === "file") {
    // Case 2: Hovering over a file node
    // Show: file -> re-exporting files -> exports
    
    if (intermediateNodes.size > 0) {
      // Draw lines through re-exporting files
      intermediateNodes.forEach((reExportFileId) => {
        const reExportFileNode = allNodes.get(reExportFileId);
        if (!reExportFileNode) return;

        // Line from file to re-exporting file
        drawLine(sourceNode, reExportFileNode, true, 0.6);

        // Find exports that this file imports through THIS specific re-exporting file
        targetNodeIds.forEach((exportId) => {
          const reExportToFilesMap = importExportMap?.exportToReExportToFiles?.get(exportId);
          if (reExportToFilesMap) {
            const importingFiles = reExportToFilesMap.get(reExportFileId);
            if (importingFiles && importingFiles.has(sourceNode.data.id)) {
              const exportNode = allNodes.get(exportId);
              if (exportNode) {
                // Line from re-exporting file to export
                drawLine(reExportFileNode, exportNode, true, 0.6);
              }
            }
          }
        });
      });
      
      // Draw direct imports (exports imported directly, not through re-exports)
      targetNodeIds.forEach((targetId) => {
        const reExportToFilesMap = importExportMap?.exportToReExportToFiles?.get(targetId);
        let isDirectImport = true;
        if (reExportToFilesMap) {
          reExportToFilesMap.forEach((importingFiles) => {
            if (importingFiles.has(sourceNode.data.id)) {
              isDirectImport = false;
            }
          });
        }
        
        if (isDirectImport) {
          const targetNode = allNodes.get(targetId);
          drawLine(sourceNode, targetNode, false, 0.8);
        }
      });
    } else {
      // Direct imports only (no re-exports)
      targetNodeIds.forEach((targetId) => {
        const targetNode = allNodes.get(targetId);
        drawLine(sourceNode, targetNode, false, 0.8);
      });
    }
  }

  return highlight;
}

export function removeHighlightLines(
  highlightGroup: d3.Selection<SVGGElement, unknown, null, undefined> | null
) {
  if (highlightGroup) {
    highlightGroup.remove();
  }
}

export function createArrowMarker(
  svg: d3.Selection<SVGSVGElement, unknown, null, undefined>
) {
  // Remove existing marker if any
  svg.select("defs").remove();

  const defs = svg.append("defs");

  // Red arrow marker for highlight lines
  defs
    .append("marker")
    .attr("id", "arrowhead-red")
    .attr("viewBox", "0 -5 10 10")
    .attr("refX", 5)
    .attr("refY", 0)
    .attr("markerWidth", 6)
    .attr("markerHeight", 6)
    .attr("orient", "auto")
    .append("path")
    .attr("d", "M0,-5L10,0L0,5")
    .attr("fill", "#ef4444");
}

