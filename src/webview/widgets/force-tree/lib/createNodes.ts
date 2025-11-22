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
  pinnedNodeRef: React.MutableRefObject<any>;
  onUnpin: () => void;
  onHide?: (nodeId: string) => void;
  hiddenNodes?: Set<string>;
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
    pinnedNodeRef,
    onUnpin,
    onHide,
    hiddenNodes = new Set(),
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
    .style("opacity", (d: any) => (hiddenNodes.has(d.data.id) ? 0 : 1))
    .style("pointer-events", (d: any) => (hiddenNodes.has(d.data.id) ? "none" : "auto"))
    .call(drag as any)
    .on("mouseover", function (event: any, d: any) {
      // Don't update tooltip if another node is pinned
      if (pinnedNodeRef.current && pinnedNodeRef.current.data.id !== d.data.id) {
        return;
      }

      const isPinned = pinnedNodeRef.current?.data.id === d.data.id;
      const content = getTooltipContent(d.data, importExportMap, allNodesMap, isPinned, onUnpin, onHide);
      tooltip
        .html(content)
        .style("opacity", 1)
        .style("pointer-events", isPinned ? "auto" : "none");

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
      // Don't update highlight lines if another node is pinned
      if (pinnedNodeRef.current && pinnedNodeRef.current.data.id !== d.data.id) {
        return;
      }

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
    .on("click", function (event: any, d: any) {
      event.stopPropagation();
      
      // Toggle pin state
      if (pinnedNodeRef.current?.data.id === d.data.id) {
        // Unpin - use the callback
        onUnpin();
      } else {
        // Pin this node
        pinnedNodeRef.current = d;
        const content = getTooltipContent(d.data, importExportMap, allNodesMap, true, onUnpin, onHide);
        tooltip
          .html(content)
          .style("opacity", 1)
          .style("pointer-events", "auto");

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
      }
    })
    .on("mouseout", function (event: any, d: any) {
      // Don't hide tooltip if this node is pinned
      if (pinnedNodeRef.current?.data.id === d.data.id) {
        return;
      }
      
      tooltip.style("opacity", 0);
      tooltip.style("pointer-events", "none");
      removeHighlightLines(highlightGroupRef.current);
      highlightGroupRef.current = null;
    });
}

