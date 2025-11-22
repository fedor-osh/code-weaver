import * as d3 from "d3";

export interface CreateTooltipOptions {
  containerElement: HTMLElement;
  chartWidth: number;
  chartHeight: number;
}

export function createTooltip(options: CreateTooltipOptions): d3.Selection<HTMLDivElement, unknown, null, undefined> {
  const { containerElement } = options;
  
  return d3
    .select(containerElement)
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
    .style("max-width", "500px")
    .style("max-height", "400px")
    .style("overflow-y", "auto")
    .style("left", "20px")
    .style("bottom", "20px")
    .style("text-align", "left");
}

