import * as d3 from "d3";

export function createForceSimulation(nodes: any[], links: any[]) {
  return d3
    .forceSimulation(nodes)
    .force(
      "link",
      d3
        .forceLink(links)
        .id((d: any) => d.id)
        .distance((d: any) => {
          // Shorter distance for export nodes to their parent files
          return d.target.data.type === "export" ? 30 : 0;
        })
        .strength(1)
    )
    .force("charge", d3.forceManyBody().strength(-50))
    .force("x", d3.forceX())
    .force("y", d3.forceY());
}

