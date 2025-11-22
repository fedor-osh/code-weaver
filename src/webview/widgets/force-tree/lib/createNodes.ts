import * as d3 from "d3";
import { createDragBehavior } from "./createDragBehavior";
import {
  getNodeFillColor,
  getNodeRadius,
  getNodeStrokeColor,
  getNodeStrokeWidth,
} from "./getNodeColors";
import { getTooltipContent } from "./getTooltipContent";

export function createNodes(
  container: d3.Selection<SVGGElement, unknown, null, undefined>,
  nodes: any[],
  simulation: d3.Simulation<any, any>,
  tooltip: d3.Selection<HTMLDivElement, unknown, null, undefined>
) {
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
        .style("opacity", 1)
        .style("left", event.pageX + 10 + "px")
        .style("top", event.pageY - 10 + "px");
    })
    .on("mousemove", function (event: any) {
      tooltip
        .style("left", event.pageX + 10 + "px")
        .style("top", event.pageY - 10 + "px");
    })
    .on("mouseout", function () {
      tooltip.style("opacity", 0);
    });
}

