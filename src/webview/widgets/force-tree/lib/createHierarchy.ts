import * as d3 from "d3";

export function createHierarchy(data: any) {
  const root = d3.hierarchy(data);
  const links = root.links();
  const nodes = root.descendants();

  // Add unique IDs to nodes
  nodes.forEach((node, i) => {
    (node as any).id = i;
  });

  return { root, links, nodes };
}

