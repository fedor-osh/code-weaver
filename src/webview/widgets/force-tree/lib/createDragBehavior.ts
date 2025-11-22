import * as d3 from "d3";

export function createDragBehavior(simulation: d3.Simulation<any, any>) {
  function dragstarted(event: any, d: any) {
    if (!event.active) simulation.alphaTarget(0.3).restart();
    d.fx = d.x;
    d.fy = d.y;
  }

  function dragged(event: any, d: any) {
    d.fx = event.x;
    d.fy = event.y;
  }

  function dragended(event: any, d: any) {
    if (!event.active) simulation.alphaTarget(0);
    d.fx = null;
    d.fy = null;
  }

  return d3
    .drag<SVGCircleElement, any>()
    .on("start", dragstarted)
    .on("drag", dragged)
    .on("end", dragended);
}

