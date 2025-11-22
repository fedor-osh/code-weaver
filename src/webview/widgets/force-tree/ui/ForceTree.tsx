import * as React from "react";
import * as d3 from "d3";
import { FileStructure } from "../../../entities/file-structure/types";
import { addIdsToStructure, resetIdCounter } from "../lib/addIds";
import { convertToD3Data } from "../lib/convertToD3Data";
import { createHierarchy } from "../lib/createHierarchy";
import { buildImportExportMap } from "../lib/buildImportExportMap";
import { createForceSimulation } from "../lib/createForceSimulation";
import { createSvg } from "../lib/createSvg";
import { createTooltip } from "../lib/createTooltip";
import { createLinks } from "../lib/createLinks";
import { createNodes } from "../lib/createNodes";
import { createZoomBehavior } from "../lib/createZoomBehavior";
import { setupSimulationTick } from "../lib/setupSimulationTick";
import { cleanup } from "../lib/cleanup";

interface ForceTreeProps {
  structure: FileStructure;
}

const CHART_CONFIG = {
  width: 928,
  height: 600,
} as const;

export function ForceTree({ structure }: ForceTreeProps) {
  const svgRef = React.useRef<SVGSVGElement>(null);
  const [zoomLevel, setZoomLevel] = React.useState(1);
  const zoomBehaviorRef = React.useRef<d3.ZoomBehavior<
    SVGSVGElement,
    unknown
  > | null>(null);
  const currentTransformRef = React.useRef<d3.ZoomTransform>(d3.zoomIdentity);
  const highlightGroupRef = React.useRef<d3.Selection<
    SVGGElement,
    unknown,
    null,
    undefined
  > | null>(null);

  React.useEffect(() => {
    if (!svgRef.current) return;

    // Reset ID counter for consistent IDs
    resetIdCounter();

    // Cleanup previous render
    cleanup(svgRef.current, null, null);
    highlightGroupRef.current = null;

    // Add IDs to structure
    const structureWithIds = addIdsToStructure(structure);

    // Build import/export relationship map
    const importExportMap = buildImportExportMap(structureWithIds);

    // Convert data structure
    const data = convertToD3Data(structureWithIds);
    const { links, nodes } = createHierarchy(data);

    // Create a map of all nodes by ID for quick lookup
    const allNodesMap = new Map<string, any>();
    nodes.forEach((node: any) => {
      if (node.data.id) {
        allNodesMap.set(node.data.id, node);
      }
    });

    // Create force simulation
    const simulation = createForceSimulation(nodes, links);

    // Create SVG and container
    const { svg, container } = createSvg(svgRef.current, CHART_CONFIG);

    // Create tooltip
    const tooltip = createTooltip();

    // Create links
    const link = createLinks(container, links);

    // Create nodes with import/export map
    const node = createNodes({
      container,
      nodes,
      simulation,
      tooltip,
      importExportMap,
      allNodesMap,
      highlightGroupRef,
    });

    // Setup simulation tick handler
    setupSimulationTick(simulation, link, node, highlightGroupRef);

    // Setup zoom behavior
    const zoom = createZoomBehavior(svg, container, {
      onZoom: (transform) => {
        currentTransformRef.current = transform;
        setZoomLevel(transform.k);
      },
    });
    zoomBehaviorRef.current = zoom;
    currentTransformRef.current = d3.zoomIdentity;

    // Cleanup function
    return () => {
      cleanup(svgRef.current!, simulation, tooltip);
      highlightGroupRef.current = null;
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
