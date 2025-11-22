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
import { calculateNodeRelations } from "./calculateNodeRelations";

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

      // Calculate relations for this node
      const { targetNodeIds, intermediateNodes } = calculateNodeRelations(d, importExportMap);

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
      const { targetNodeIds, intermediateNodes } = calculateNodeRelations(d, importExportMap);

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

