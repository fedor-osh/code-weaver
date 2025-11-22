import * as d3 from "d3";

export function createTooltip(): d3.Selection<HTMLDivElement, unknown, null, undefined> {
  return d3
    .select("body")
    .append("div")
    .attr("class", "force-tree-tooltip")
    .style("position", "absolute")
    .style("background", "rgba(0, 0, 0, 0.9)")
    .style("color", "white")
    .style("padding", "8px 12px")
    .style("border-radius", "4px")
    .style("font-size", "12px")
    .style("pointer-events", "none")
    .style("opacity", 0)
    .style("z-index", 1000)
    .style("box-shadow", "0 2px 8px rgba(0,0,0,0.3)")
    .style("max-width", "300px");
}

