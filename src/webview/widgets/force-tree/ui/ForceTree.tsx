import * as React from "react";
import * as d3 from "d3";
import { FileStructure } from "../../../entities/file-structure/types";

interface ForceTreeProps {
  structure: FileStructure;
}

export function ForceTree({ structure }: ForceTreeProps) {
  const svgRef = React.useRef<SVGSVGElement>(null);

  React.useEffect(() => {
    if (!svgRef.current) return;

    // Clear previous content
    d3.select(svgRef.current).selectAll("*").remove();
    
    // Remove any existing tooltip
    d3.select("body").selectAll(".force-tree-tooltip").remove();

    // Specify the chart's dimensions
    const width = 928;
    const height = 600;

    // Convert FileStructure to D3 hierarchy format
    const convertToD3Data = (fs: FileStructure): any => {
      const data: any = {
        name: fs.name,
        type: fs.type,
        imports: fs.imports,
        exports: fs.exports,
      };
      if (fs.children && fs.children.length > 0) {
        data.children = fs.children.map(convertToD3Data);
      }
      return data;
    };

    const data = convertToD3Data(structure);

    // Compute the graph and start the force simulation
    const root = d3.hierarchy(data);
    const links = root.links();
    const nodes = root.descendants();

    // Add unique IDs to nodes
    nodes.forEach((node, i) => {
      (node as any).id = i;
    });

    const simulation = d3
      .forceSimulation(nodes as any)
      .force(
        "link",
        d3
          .forceLink(links)
          .id((d: any) => d.id)
          .distance(0)
          .strength(1)
      )
      .force("charge", d3.forceManyBody().strength(-50))
      .force("x", d3.forceX())
      .force("y", d3.forceY());

    // Create the container SVG
    const svg = d3
      .select(svgRef.current)
      .attr("width", width)
      .attr("height", height)
      .attr("viewBox", [-width / 2, -height / 2, width, height])
      .attr("style", "max-width: 100%; height: auto;");

    // Create tooltip
    const tooltip = d3
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

    // Append links
    const link = svg
      .append("g")
      .attr("stroke", "#999")
      .attr("stroke-opacity", 0.6)
      .selectAll("line")
      .data(links)
      .join("line");

    // Drag function
    const drag = (simulation: d3.Simulation<any, any>) => {
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
    };

    // Append nodes
    const node = svg
      .append("g")
      .attr("fill", "#fff")
      .attr("stroke", "#000")
      .attr("stroke-width", 1.5)
      .selectAll("circle")
      .data(nodes)
      .join("circle")
      .attr("fill", (d: any) => (d.children ? null : "#000"))
      .attr("stroke", (d: any) => (d.children ? null : "#fff"))
      .attr("r", 3.5)
      .style("cursor", "pointer")
      .call(drag(simulation))
      .on("mouseover", function (event: any, d: any) {
        const data = d.data;
        const importCount = data.imports?.length || 0;
        const exportCount = data.exports?.length || 0;

        let tooltipContent = `<div style="font-weight: bold; margin-bottom: 4px;">${data.name}</div>`;
        
        if (importCount > 0 || exportCount > 0) {
          tooltipContent += `<div style="font-size: 11px; opacity: 0.9;">`;
          if (importCount > 0) {
            tooltipContent += `Imports: ${importCount}`;
          }
          if (importCount > 0 && exportCount > 0) {
            tooltipContent += " • ";
          }
          if (exportCount > 0) {
            tooltipContent += `Exports: ${exportCount}`;
          }
          tooltipContent += `</div>`;
        }

        tooltip
          .html(tooltipContent)
          .style("opacity", 1)
          .style("left", event.pageX + 10 + "px")
          .style("top", event.pageY - 10 + "px");
      })
      .on("mousemove", function (event: any) {
        tooltip
          .style("left", event.pageX + 10 + "px")
          .style("top", event.pageY - 10 + "px");
      })
      .on("mouseout", function () {
        tooltip.style("opacity", 0);
      });

    simulation.on("tick", () => {
      link
        .attr("x1", (d: any) => d.source.x)
        .attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x)
        .attr("y2", (d: any) => d.target.y);

      node.attr("cx", (d: any) => d.x).attr("cy", (d: any) => d.y);
    });

    // Cleanup function
    return () => {
      simulation.stop();
      tooltip.remove();
    };
  }, [structure]);

  return (
    <div className="w-full overflow-auto">
      <svg ref={svgRef}></svg>
    </div>
  );
}

