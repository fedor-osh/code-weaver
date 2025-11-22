import * as d3 from "d3";
import { getLinkStrokeColor } from "./getLinkStrokeColor";

export function createLinks(
  container: d3.Selection<SVGGElement, unknown, null, undefined>,
  links: any[]
) {
  return container
    .append("g")
    .selectAll("line")
    .data(links)
    .join("line")
    .attr("stroke", (d: any) => getLinkStrokeColor(d.target.data))
    .attr("stroke-opacity", (d: any) => (d.target.data.type === "export" ? 0.8 : 0.6))
    .attr("stroke-width", (d: any) => (d.target.data.type === "export" ? 1.5 : 1))
    .attr("stroke-dasharray", (d: any) =>
      d.target.data.type === "export" ? "3,3" : null
    );
}

