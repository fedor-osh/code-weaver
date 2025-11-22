import * as d3 from "d3";
import { createDragBehavior } from "./createDragBehavior";
import {
  getNodeFillColor,
  getNodeRadius,
  getNodeStrokeColor,
  getNodeStrokeWidth,
} from "./getNodeColors";
import { getTooltipContent } from "./getTooltipContent";
import { ImportExportMap } from "./buildImportExportMap";
import { drawHighlightLines, removeHighlightLines } from "./drawHighlightLines";

export interface CreateNodesOptions {
  container: d3.Selection<SVGGElement, unknown, null, undefined>;
  nodes: any[];
  simulation: d3.Simulation<any, any>;
  tooltip: d3.Selection<HTMLDivElement, unknown, null, undefined>;
  importExportMap: ImportExportMap;
  allNodesMap: Map<string, any>;
  highlightGroupRef: React.MutableRefObject<d3.Selection<SVGGElement, unknown, null, undefined> | null>;
}

export function createNodes(options: CreateNodesOptions) {
  const {
    container,
    nodes,
    simulation,
    tooltip,
    importExportMap,
    allNodesMap,
    highlightGroupRef,
  } = options;

  const drag = createDragBehavior(simulation);

  return container
    .append("g")
    .selectAll("circle")
    .data(nodes)
    .join("circle")
    .attr("fill", (d: any) => getNodeFillColor(d.data, !!d.children))
    .attr("stroke", (d: any) => getNodeStrokeColor(d.data, !!d.children))
    .attr("stroke-width", (d: any) => getNodeStrokeWidth(d.data))
    .attr("r", (d: any) => getNodeRadius(d.data))
    .style("cursor", "pointer")
    .call(drag as any)
    .on("mouseover", function (event: any, d: any) {
      const content = getTooltipContent(d.data);
      tooltip
        .html(content)
        .style("opacity", 1);

      // Draw highlight lines based on node type
      const nodeId = d.data.id;
      let targetNodeIds: Set<string> = new Set();
      let intermediateNodes: Set<string> = new Set();

      if (d.data.type === "export") {
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
      } else if (d.data.type === "file") {
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
                targetNodeIds.add(exportId);
              }
            } else {
              // Direct import (no re-exports)
              targetNodeIds.add(exportId);
            }
          });
        }
      }

      if (targetNodeIds.size > 0 || intermediateNodes.size > 0) {
        highlightGroupRef.current = drawHighlightLines({
          container,
          sourceNode: d,
          targetNodeIds,
          intermediateNodes,
          allNodes: allNodesMap,
          highlightGroup: highlightGroupRef.current,
          importExportMap,
        });
      }
    })
    .on("mousemove", function (event: any, d: any) {
      // Update highlight lines position
      const nodeId = d.data.id;
      let targetNodeIds: Set<string> = new Set();
      let intermediateNodes: Set<string> = new Set();

      if (d.data.type === "export") {
        const files = importExportMap.exportToFiles.get(nodeId);
        if (files) {
          const reExportToFilesMap = importExportMap.exportToReExportToFiles?.get(nodeId);
          if (reExportToFilesMap && reExportToFilesMap.size > 0) {
            reExportToFilesMap.forEach((importingFiles, reExportFileId) => {
              intermediateNodes.add(reExportFileId);
              importingFiles.forEach((fileId) => targetNodeIds.add(fileId));
            });
            files.forEach((fileId) => {
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
            files.forEach((fileId) => targetNodeIds.add(fileId));
          }
        }
      } else if (d.data.type === "file") {
        const exports = importExportMap.fileToExports.get(nodeId);
        if (exports) {
          exports.forEach((exportId) => {
            const reExportToFilesMap = importExportMap.exportToReExportToFiles?.get(exportId);
            if (reExportToFilesMap && reExportToFilesMap.size > 0) {
              let foundReExportFile: string | null = null;
              reExportToFilesMap.forEach((importingFiles, reExportFileId) => {
                if (importingFiles.has(nodeId)) {
                  foundReExportFile = reExportFileId;
                }
              });
              
              if (foundReExportFile) {
                intermediateNodes.add(foundReExportFile);
                targetNodeIds.add(exportId);
              } else {
                targetNodeIds.add(exportId);
              }
            } else {
              targetNodeIds.add(exportId);
            }
          });
        }
      }

      if ((targetNodeIds.size > 0 || intermediateNodes.size > 0) && highlightGroupRef.current) {
        // Remove old lines
        highlightGroupRef.current.remove();
        // Draw new lines with updated positions
        highlightGroupRef.current = drawHighlightLines({
          container,
          sourceNode: d,
          targetNodeIds,
          intermediateNodes,
          allNodes: allNodesMap,
          highlightGroup: null,
          importExportMap,
        });
      }
    })
    .on("mouseout", function () {
      tooltip.style("opacity", 0);
      removeHighlightLines(highlightGroupRef.current);
      highlightGroupRef.current = null;
    });
}

