import * as d3 from "d3";

export function cleanup(
  svgElement: SVGSVGElement | null,
  simulation: d3.Simulation<any, any> | null,
  tooltip: d3.Selection<HTMLDivElement, unknown, null, undefined> | null
) {
  if (simulation) {
    simulation.stop();
  }
  if (tooltip) {
    tooltip.remove();
  }
  if (svgElement) {
    d3.select(svgElement).selectAll("*").remove();
  }
  d3.select("body").selectAll(".force-tree-tooltip").remove();
}

