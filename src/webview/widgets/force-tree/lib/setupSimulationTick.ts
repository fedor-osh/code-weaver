import * as d3 from "d3";
import * as React from "react";

export function setupSimulationTick(
  simulation: d3.Simulation<any, any>,
  link: d3.Selection<d3.BaseType | SVGLineElement, any, SVGGElement, unknown>,
  node: d3.Selection<d3.BaseType | SVGCircleElement, any, SVGGElement, unknown>,
  highlightGroupRef?: React.MutableRefObject<d3.Selection<SVGGElement, unknown, null, undefined> | null>,
  allRelationsGroupRef?: React.MutableRefObject<d3.Selection<SVGGElement, unknown, null, undefined> | null>,
  hiddenNodes?: Set<string>
) {
  simulation.on("tick", () => {
    link
      .attr("x1", (d: any) => d.source.x)
      .attr("y1", (d: any) => d.source.y)
      .attr("x2", (d: any) => d.target.x)
      .attr("y2", (d: any) => d.target.y);

    node
      .attr("cx", (d: any) => d.x)
      .attr("cy", (d: any) => d.y);

    // Update highlight lines positions if they exist
    if (highlightGroupRef?.current) {
      highlightGroupRef.current
        .selectAll("line")
        .attr("x1", (d: any) => d.source.x)
        .attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x)
        .attr("y2", (d: any) => d.target.y);
    }

    // Update all relations lines positions if they exist
    if (allRelationsGroupRef?.current) {
      allRelationsGroupRef.current
        .selectAll("line")
        .attr("x1", (d: any) => d.source.x)
        .attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x)
        .attr("y2", (d: any) => d.target.y);
    }
  });
}

