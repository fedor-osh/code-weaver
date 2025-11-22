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
    
    // Use dashed line only for relations between file and export
    const fromType = from.data?.type;
    const toType = to.data?.type;
    const isFileToExport = (fromType === "file" && toType === "export") || (fromType === "export" && toType === "file");
    const shouldBeDashed = isFileToExport;
    
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
      .attr("stroke-dasharray", shouldBeDashed ? "4,4" : null)
      .attr("marker-end", "url(#arrowhead-red)")
      .style("filter", `drop-shadow(0 0 2px rgba(239, 68, 68, ${opacity * 0.6}))`);
  };

  if (sourceNode.data?.type === "export") {
    // Case 1: Hovering over an export node
    // Show: export -> file containing export -> importing files OR export -> re-exporting files -> importing files
    
    // Get the file that contains this export
    const exportInfo = importExportMap?.exportIdToInfo.get(sourceNode.data.id);
    const fileContainingExport = exportInfo?.fileId;
    const reExportToFilesMap = importExportMap?.exportToReExportToFiles?.get(sourceNode.data.id);
    
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
        const intermediateNode = allNodes.get(intermediateId);
        if (!intermediateNode) return;

        // Check if this is a re-exporting file or the file containing the export
        const isReExportingFile = reExportToFilesMap ? reExportToFilesMap.has(intermediateId) : false;
        const isFileContainingExport = intermediateId === fileContainingExport;

        if (isReExportingFile || isFileContainingExport) {
          // Line from export to intermediate node
          drawLine(sourceNode, intermediateNode, true, 0.6);

          // Draw lines from intermediate node to importing files
          const importingFiles = filesByIntermediate.get(intermediateId);
          if (importingFiles) {
            importingFiles.forEach((importingFileId) => {
              const importingFileNode = allNodes.get(importingFileId);
              if (importingFileNode) {
                // Line from intermediate node to importing file
                drawLine(intermediateNode, importingFileNode, true, 0.6);
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
          const targetNode = allNodes.get(targetId);
          drawLine(sourceNode, targetNode, false, 0.8);
        }
      });
    } else {
      // Direct imports only (no intermediates)
      targetNodeIds.forEach((targetId) => {
        const targetNode = allNodes.get(targetId);
        drawLine(sourceNode, targetNode, false, 0.8);
      });
    }
  } else if (sourceNode.data?.type === "file") {
    // Case 2: Hovering over a file node
    // Show: file -> re-exporting files -> exports OR file -> file containing export -> export
    
    if (intermediateNodes.size > 0) {
      // Group exports by their intermediate node
      const exportsByIntermediate = new Map<string, Set<string>>();
      
      targetNodeIds.forEach((exportId) => {
        // Check if this export goes through a re-exporting file
        const reExportToFilesMap = importExportMap?.exportToReExportToFiles?.get(exportId);
        let intermediateId: string | null = null;
        
        if (reExportToFilesMap) {
          // Check if any re-exporting file is in intermediateNodes and imports this file
          reExportToFilesMap.forEach((importingFiles, reExportFileId) => {
            if (intermediateNodes.has(reExportFileId) && importingFiles.has(sourceNode.data.id)) {
              intermediateId = reExportFileId;
            }
          });
        }
        
        // If not through re-export, check if the file containing the export is an intermediate
        if (!intermediateId) {
          const exportInfo = importExportMap?.exportIdToInfo.get(exportId);
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
        const intermediateNode = allNodes.get(intermediateId);
        if (!intermediateNode) return;

        // Check if this is a re-exporting file or the file containing the export
        const isReExportingFile = Array.from(importExportMap?.exportToReExportToFiles?.values() || [])
          .some(map => map.has(intermediateId));
        
        // Line from file to intermediate node
        drawLine(sourceNode, intermediateNode, true, 0.6);

        // Draw lines from intermediate node to exports
        const exports = exportsByIntermediate.get(intermediateId);
        if (exports) {
          exports.forEach((exportId) => {
            const exportNode = allNodes.get(exportId);
            if (exportNode) {
              // Line from intermediate node to export
              drawLine(intermediateNode, exportNode, true, 0.6);
            }
          });
        }
      });
      
      // Draw direct imports (exports imported directly, not through any intermediate)
      targetNodeIds.forEach((targetId) => {
        const reExportToFilesMap = importExportMap?.exportToReExportToFiles?.get(targetId);
        const exportInfo = importExportMap?.exportIdToInfo.get(targetId);
        
        let isDirectImport = true;
        
        // Check if it goes through a re-exporting file
        if (reExportToFilesMap) {
          reExportToFilesMap.forEach((importingFiles) => {
            if (importingFiles.has(sourceNode.data.id)) {
              isDirectImport = false;
            }
          });
        }
        
        // Check if it goes through the file containing the export
        if (isDirectImport && exportInfo && intermediateNodes.has(exportInfo.fileId)) {
          isDirectImport = false;
        }
        
        if (isDirectImport) {
          const targetNode = allNodes.get(targetId);
          drawLine(sourceNode, targetNode, false, 0.8);
        }
      });
    } else {
      // Direct imports only (no intermediates)
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

