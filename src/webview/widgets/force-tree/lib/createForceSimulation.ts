import * as d3 from "d3";

// Helper function to check if a link is a folder-to-folder link at first two levels
function isProminentFolderLink(d: any): boolean {
  const sourceIsFolder = d.source.data.type === "folder";
  const targetIsFolder = d.target.data.type === "folder";
  const targetDepth = d.target.depth;
  
  // First two levels: root (depth 0) to first level (depth 1), and first level (depth 1) to second level (depth 2)
  return sourceIsFolder && targetIsFolder && (targetDepth === 1 || targetDepth === 2);
}

export function createForceSimulation(nodes: any[], links: any[]) {
  // Identify prominent folder nodes (root and first two levels of folders)
  const prominentFolderIds = new Set<string>();
  nodes.forEach((node: any) => {
    if (node.data.type === "folder" && (node.depth === 0 || node.depth === 1 || node.depth === 2)) {
      if (node.data.id) {
        prominentFolderIds.add(node.data.id);
      }
    }
  });

  return d3
    .forceSimulation(nodes)
    .force(
      "link",
      d3
        .forceLink(links)
        .id((d: any) => d.id)
        .distance((d: any) => {
          // Shorter distance for export nodes to their parent files
          if (d.target.data.type === "export") return 30;
          // Longer distance for prominent folder-to-folder links
          if (isProminentFolderLink(d)) {
            const targetDepth = d.target.depth;
            return targetDepth === 1 ? 150 : 120; // Root to src: 150, src to children: 120
          }
          return 0;
        })
        .strength((d: any) => {
          // Stronger link force for prominent folder links
          if (isProminentFolderLink(d)) return 1.5;
          return 1;
        })
    )
    .force("charge", d3.forceManyBody().strength((d: any) => {
      // Stronger repulsion for prominent folder nodes to keep space around them
      if (prominentFolderIds.has(d.data.id)) {
        return -200;
      }
      return -50;
    }))
    .force("collision", d3.forceCollide().radius((d: any) => {
      // Larger collision radius for prominent folder nodes to prevent crowding
      if (prominentFolderIds.has(d.data.id)) {
        return 40;
      }
      return 8;
    }))
    .force("x", d3.forceX())
    .force("y", d3.forceY());
}

