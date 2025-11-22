import * as d3 from "d3";
import { getLinkStrokeColor } from "./getLinkStrokeColor";

// Helper function to check if a link is a folder-to-folder link at first two levels
function isProminentFolderLink(d: any): boolean {
  const sourceIsFolder = d.source.data.type === "folder";
  const targetIsFolder = d.target.data.type === "folder";
  const targetDepth = d.target.depth;
  
  // First two levels: root (depth 0) to first level (depth 1), and first level (depth 1) to second level (depth 2)
  return sourceIsFolder && targetIsFolder && (targetDepth === 1 || targetDepth === 2);
}

export function createLinks(
  container: d3.Selection<SVGGElement, unknown, null, undefined>,
  links: any[],
  hiddenNodes?: Set<string>
) {
  return container
    .append("g")
    .selectAll("line")
    .data(links)
    .join("line")
    .attr("stroke", (d: any) => getLinkStrokeColor(d.target.data))
    .attr("stroke-opacity", (d: any) => {
      const isHidden = hiddenNodes && (
        hiddenNodes.has(d.source.data.id) || 
        hiddenNodes.has(d.target.data.id)
      );
      if (isHidden) return 0;
      return d.target.data.type === "export" ? 0.8 : 0.6;
    })
    .attr("stroke-width", (d: any) => {
      if (d.target.data.type === "export") return 1.5;
      if (isProminentFolderLink(d)) return 3; // Thicker for prominent folder links
      return 1;
    })
    .attr("stroke-dasharray", (d: any) =>
      d.target.data.type === "export" ? "3,3" : null
    );
}

