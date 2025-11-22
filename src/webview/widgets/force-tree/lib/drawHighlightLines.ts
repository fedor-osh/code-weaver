import * as d3 from "d3";
import { ImportExportMap } from "./buildImportExportMap";

export interface DrawHighlightLinesOptions {
  container: d3.Selection<SVGGElement, unknown, null, undefined>;
  sourceNode: any;
  targetNodeIds: Set<string>;
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

  targetNodeIds.forEach((targetId) => {
    const targetNode = allNodes.get(targetId);
    if (!targetNode || !sourceNode || sourceNode.x === undefined || sourceNode.y === undefined) return;
    if (targetNode.x === undefined || targetNode.y === undefined) return;

    // Draw direct line
    const line = highlight
      .append("line")
      .datum({ source: sourceNode, target: targetNode })
      .attr("x1", sourceNode.x)
      .attr("y1", sourceNode.y)
      .attr("x2", targetNode.x)
      .attr("y2", targetNode.y)
      .attr("stroke", "#ef4444") // Red color
      .attr("stroke-width", 2)
      .attr("stroke-opacity", 0.8)
      .attr("marker-end", "url(#arrowhead-red)")
      .style("filter", "drop-shadow(0 0 2px rgba(239, 68, 68, 0.5))");

    // If this is an export node and we have importExportMap, check for re-export chain
    if (
      sourceNode.data?.type === "export" &&
      importExportMap &&
      importExportMap.exportToReExportFiles
    ) {
      const reExportFiles = importExportMap.exportToReExportFiles.get(sourceNode.data.id);
      if (reExportFiles) {
        // Draw lines from export -> re-exporting files -> final importing files
        reExportFiles.forEach((reExportFileId) => {
          const reExportFileNode = allNodes.get(reExportFileId);
          if (!reExportFileNode || reExportFileNode.x === undefined || reExportFileNode.y === undefined) return;

          // Line from original export to re-exporting file
          highlight
            .append("line")
            .datum({ source: sourceNode, target: reExportFileNode })
            .attr("x1", sourceNode.x)
            .attr("y1", sourceNode.y)
            .attr("x2", reExportFileNode.x)
            .attr("y2", reExportFileNode.y)
            .attr("stroke", "#ef4444")
            .attr("stroke-width", 2)
            .attr("stroke-opacity", 0.6)
            .attr("stroke-dasharray", "4,4")
            .attr("marker-end", "url(#arrowhead-red)")
            .style("filter", "drop-shadow(0 0 2px rgba(239, 68, 68, 0.3))");

          // Find files that import this export through the re-exporting file
          // These are files that import from the re-exporting file and have this export in their imports
          const allFilesImportingThisExport = importExportMap.exportToFiles.get(sourceNode.data.id);
          if (allFilesImportingThisExport) {
            allFilesImportingThisExport.forEach((importingFileId) => {
              // Check if this file imports from the re-exporting file
              const fileToExports = importExportMap.fileToExports.get(importingFileId);
              // If the file imports from the re-exporting file, draw line from re-export file to importing file
              // We check this by seeing if the file has any relationship with the re-exporting file
              const reExportFileToExports = importExportMap.reExportFileToExports?.get(reExportFileId);
              if (reExportFileToExports && reExportFileToExports.has(sourceNode.data.id)) {
                const importingFileNode = allNodes.get(importingFileId);
                if (importingFileNode && importingFileNode.x !== undefined && importingFileNode.y !== undefined) {
                  // Line from re-exporting file to importing file
                  highlight
                    .append("line")
                    .datum({ source: reExportFileNode, target: importingFileNode })
                    .attr("x1", reExportFileNode.x)
                    .attr("y1", reExportFileNode.y)
                    .attr("x2", importingFileNode.x)
                    .attr("y2", importingFileNode.y)
                    .attr("stroke", "#ef4444")
                    .attr("stroke-width", 2)
                    .attr("stroke-opacity", 0.6)
                    .attr("stroke-dasharray", "4,4")
                    .attr("marker-end", "url(#arrowhead-red)")
                    .style("filter", "drop-shadow(0 0 2px rgba(239, 68, 68, 0.3))");
                }
              }
            });
          }
        });
      }
    }
  });

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

