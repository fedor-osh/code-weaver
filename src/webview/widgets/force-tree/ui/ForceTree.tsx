import * as React from "react";
import * as d3 from "d3";
import { FileStructure } from "../../../entities/file-structure/types";

interface ForceTreeProps {
  structure: FileStructure;
}

export function ForceTree({ structure }: ForceTreeProps) {
  const svgRef = React.useRef<SVGSVGElement>(null);
  const [zoomLevel, setZoomLevel] = React.useState(1);
  const zoomBehaviorRef = React.useRef<d3.ZoomBehavior<
    SVGSVGElement,
    unknown
  > | null>(null);
  const currentTransformRef = React.useRef<d3.ZoomTransform>(d3.zoomIdentity);

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

      const children: any[] = [];

      // Add folder/file children
      if (fs.children && fs.children.length > 0) {
        children.push(...fs.children.map(convertToD3Data));
      }

      // For file nodes, add export nodes as children
      if (fs.type === "file" && fs.exports && fs.exports.length > 0) {
        fs.exports.forEach((exp) => {
          children.push({
            name: exp.name,
            type: "export",
            isDefault: exp.isDefault,
            isTypeOnly: exp.isTypeOnly,
            parentFile: fs.name,
          });
        });
      }

      if (children.length > 0) {
        data.children = children;
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
          .distance((d: any) => {
            // Shorter distance for export nodes to their parent files
            return d.target.data.type === "export" ? 30 : 0;
          })
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

    // Create a container group for zooming
    const container = svg.append("g").attr("class", "zoom-container");

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
    const link = container
      .append("g")
      .selectAll("line")
      .data(links)
      .join("line")
      .attr("stroke", (d: any) => {
        // Different color for export links based on export type
        if (d.target.data.type === "export") {
          const exportData = d.target.data;
          if (exportData.isDefault) {
            return "#ff6b6b"; // Red for default exports
          } else {
            return exportData.isTypeOnly ? "#9b59b6" : "#4ecdc4"; // Purple for types, teal for objects
          }
        }
        return "#999"; // Gray for folder/file links
      })
      .attr("stroke-opacity", (d: any) => {
        return d.target.data.type === "export" ? 0.8 : 0.6;
      })
      .attr("stroke-width", (d: any) => {
        return d.target.data.type === "export" ? 1.5 : 1;
      })
      .attr("stroke-dasharray", (d: any) => {
        // Dashed line for export links
        return d.target.data.type === "export" ? "3,3" : null;
      });

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
    const node = container
      .append("g")
      .selectAll("circle")
      .data(nodes)
      .join("circle")
      .attr("fill", (d: any) => {
        const data = d.data;
        if (data.type === "export") {
          if (data.isDefault) {
            return "#ff6b6b"; // Red for default exports (same color regardless of type/object)
          } else {
            // Different colors for types vs objects
            return data.isTypeOnly ? "#9b59b6" : "#4ecdc4"; // Purple for types, teal for objects
          }
        }
        return d.children ? "#fff" : "#000"; // White for folders, black for files
      })
      .attr("stroke", (d: any) => {
        const data = d.data;
        if (data.type === "export") {
          if (data.isDefault) {
            return "#c92a2a"; // Darker red border for default exports
          } else {
            // Different border colors for types vs objects
            return data.isTypeOnly ? "#7c3aed" : "#087f5b"; // Darker purple for types, darker teal for objects
          }
        }
        return d.children ? "#000" : "#fff"; // Black for folders, white for files
      })
      .attr("stroke-width", (d: any) => {
        return d.data.type === "export" ? 1 : 1.5;
      })
      .attr("r", (d: any) => {
        return d.data.type === "export" ? 2.5 : 3.5; // Smaller radius for export nodes
      })
      .style("cursor", "pointer")
      .call(drag(simulation) as any)
      .on("mouseover", function (event: any, d: any) {
        const data = d.data;
        let tooltipContent = "";

        if (data.type === "export") {
          // Tooltip for export nodes
          const defaultLabel = data.isDefault ? " (default)" : "";
          const typeLabel = data.isTypeOnly ? " [type]" : "";
          tooltipContent = `<div style="font-weight: bold; margin-bottom: 4px;">${data.name}${defaultLabel}${typeLabel}</div>`;
          tooltipContent += `<div style="font-size: 11px; opacity: 0.9;">From: ${data.parentFile}</div>`;
        } else {
          // Tooltip for file/folder nodes
          const importCount = data.imports?.length || 0;
          const exportCount = data.exports?.length || 0;

          tooltipContent = `<div style="font-weight: bold; margin-bottom: 4px;">${data.name}</div>`;

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

    // Set up zoom behavior
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on("zoom", (event) => {
        currentTransformRef.current = event.transform;
        container.attr("transform", event.transform.toString());
        setZoomLevel(event.transform.k);
      });

    svg.call(zoom);
    zoomBehaviorRef.current = zoom;

    // Initialize the transform
    currentTransformRef.current = d3.zoomIdentity;

    // Cleanup function
    return () => {
      simulation.stop();
      tooltip.remove();
    };
  }, [structure]);

  const handleResetZoom = () => {
    if (!svgRef.current || !zoomBehaviorRef.current) return;
    const svg = d3.select(svgRef.current);
    const resetTransform = d3.zoomIdentity;
    currentTransformRef.current = resetTransform;

    svg
      .transition()
      .duration(300)
      .call(zoomBehaviorRef.current.transform, resetTransform);
  };

  return (
    <div className='w-full overflow-auto relative'>
      <svg ref={svgRef}></svg>
      <div className='absolute top-4 right-4 flex flex-col gap-2 bg-white rounded-lg shadow-lg border border-gray-200 p-1 z-10'>
        <button
          onClick={handleResetZoom}
          className='w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100 transition-colors text-gray-700 text-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent'
          title='Reset zoom'
          disabled={zoomLevel === 1}
        >
          ⟲
        </button>
      </div>
    </div>
  );
}
