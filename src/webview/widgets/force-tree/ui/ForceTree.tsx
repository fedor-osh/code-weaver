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
import { drawAllHighlightLines } from "../lib/drawAllHighlightLines";
import { removeHighlightLines } from "../lib/drawHighlightLines";

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
  const [showAllRelations, setShowAllRelations] = React.useState(false);
  const [hiddenNodes, setHiddenNodes] = React.useState<Set<string>>(new Set());
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
  const allRelationsGroupRef = React.useRef<d3.Selection<
    SVGGElement,
    unknown,
    null,
    undefined
  > | null>(null);
  const containerRef = React.useRef<d3.Selection<
    SVGGElement,
    unknown,
    null,
    undefined
  > | null>(null);
  const nodesRef = React.useRef<any[]>([]);
  const allNodesMapRef = React.useRef<Map<string, any>>(new Map());
  const importExportMapRef = React.useRef<any>(null);
  const pinnedNodeRef = React.useRef<any>(null);
  const tooltipRef = React.useRef<d3.Selection<
    HTMLDivElement,
    unknown,
    null,
    undefined
  > | null>(null);
  const linkRef = React.useRef<d3.Selection<
    d3.BaseType | SVGLineElement,
    any,
    SVGGElement,
    unknown
  > | null>(null);
  const nodeRef = React.useRef<d3.Selection<
    d3.BaseType | SVGCircleElement,
    any,
    SVGGElement,
    unknown
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
    allNodesMapRef.current = allNodesMap;
    nodesRef.current = nodes;
    importExportMapRef.current = importExportMap;

    // Create force simulation
    const simulation = createForceSimulation(nodes, links);

    // Create SVG and container
    const { svg, container } = createSvg(svgRef.current, CHART_CONFIG);
    containerRef.current = container;

    // Create tooltip positioned at bottom center
    const containerElement = svgRef.current.parentElement;
    const tooltip = createTooltip({
      containerElement: containerElement!,
      chartWidth: CHART_CONFIG.width,
      chartHeight: CHART_CONFIG.height,
    });
    tooltipRef.current = tooltip;

    // Setup global unpin function for button click
    const handleUnpin = () => {
      pinnedNodeRef.current = null;
      if (tooltipRef.current) {
        tooltipRef.current.style("opacity", 0);
        tooltipRef.current.style("pointer-events", "none");
      }
      removeHighlightLines(highlightGroupRef.current);
      highlightGroupRef.current = null;
    };
    (window as any).unpinTooltip = handleUnpin;

    // Helper function to get all descendant node IDs (including the node itself)
    const getAllDescendantIds = (nodeId: string): Set<string> => {
      const node = allNodesMap.get(nodeId);
      if (!node) return new Set([nodeId]);

      const descendantIds = new Set<string>([nodeId]);

      // Use d3.hierarchy's descendants() method to get all children recursively
      if (node.descendants) {
        node.descendants().forEach((descendant: any) => {
          if (descendant.data.id) {
            descendantIds.add(descendant.data.id);
          }
        });
      }

      return descendantIds;
    };

    // Setup global hide function for button click
    const handleHide = (nodeId: string) => {
      // Get all descendant IDs including the node itself
      const idsToHide = getAllDescendantIds(nodeId);

      setHiddenNodes((prev) => {
        const newSet = new Set(prev);
        idsToHide.forEach((id) => newSet.add(id));
        return newSet;
      });

      // Unpin if hiding the pinned node or any of its descendants
      if (
        pinnedNodeRef.current &&
        idsToHide.has(pinnedNodeRef.current.data.id)
      ) {
        handleUnpin();
      }
    };
    (window as any).hideNode = handleHide;

    // Create links
    const link = createLinks(container, links, hiddenNodes);
    linkRef.current = link;

    // Create nodes with import/export map
    const node = createNodes({
      container,
      nodes,
      simulation,
      tooltip,
      importExportMap,
      allNodesMap,
      highlightGroupRef,
      pinnedNodeRef,
      onUnpin: handleUnpin,
      onHide: handleHide,
      hiddenNodes,
    });
    nodeRef.current = node;

    // Setup simulation tick handler
    setupSimulationTick(
      simulation,
      link,
      node,
      highlightGroupRef,
      allRelationsGroupRef,
      hiddenNodes
    );

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
      allRelationsGroupRef.current = null;
      pinnedNodeRef.current = null;
      linkRef.current = null;
      nodeRef.current = null;
      delete (window as any).unpinTooltip;
      delete (window as any).hideNode;
    };
  }, [structure, hiddenNodes]);

  // Update links and nodes visibility when hiddenNodes changes
  React.useEffect(() => {
    if (!linkRef.current || !nodeRef.current) return;

    // Update links opacity
    linkRef.current.attr("stroke-opacity", (d: any) => {
      const isHidden =
        hiddenNodes.has(d.source.data.id) || hiddenNodes.has(d.target.data.id);
      if (isHidden) return 0;
      return d.target.data.type === "export" ? 0.8 : 0.6;
    });

    // Update nodes opacity
    nodeRef.current
      .style("opacity", (d: any) => (hiddenNodes.has(d.data.id) ? 0 : 1))
      .style("pointer-events", (d: any) =>
        hiddenNodes.has(d.data.id) ? "none" : "auto"
      );
  }, [hiddenNodes]);

  // Handle show all relations toggle
  React.useEffect(() => {
    if (!containerRef.current || !nodesRef.current.length) return;

    if (showAllRelations) {
      // Draw all relations - use a small delay to ensure nodes have positions
      const drawRelations = () => {
        allRelationsGroupRef.current = drawAllHighlightLines({
          container: containerRef.current!,
          nodes: nodesRef.current,
          allNodesMap: allNodesMapRef.current,
          importExportMap: importExportMapRef.current,
          hiddenNodes,
        });
      };

      // Try to draw immediately
      drawRelations();

      // Also try after a short delay in case nodes don't have positions yet
      const timeoutId = setTimeout(() => {
        drawRelations();
      }, 100);

      return () => {
        clearTimeout(timeoutId);
      };
    } else {
      // Remove all relations
      removeHighlightLines(allRelationsGroupRef.current);
      allRelationsGroupRef.current = null;
    }
  }, [showAllRelations, hiddenNodes]);

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

  const handleShowNode = (nodeId: string) => {
    // Get all descendant IDs including the node itself
    const node = allNodesMapRef.current.get(nodeId);
    if (!node) return;

    const idsToShow = new Set<string>([nodeId]);

    // Use d3.hierarchy's descendants() method to get all children recursively
    if (node.descendants) {
      node.descendants().forEach((descendant: any) => {
        if (descendant.data.id) {
          idsToShow.add(descendant.data.id);
        }
      });
    }

    setHiddenNodes((prev) => {
      const newSet = new Set(prev);
      idsToShow.forEach((id) => newSet.delete(id));
      return newSet;
    });
  };

  // Get hidden node names for display
  const hiddenNodeNames = React.useMemo(() => {
    const names: Array<{ id: string; name: string }> = [];
    hiddenNodes.forEach((nodeId) => {
      const node = allNodesMapRef.current.get(nodeId);
      if (node) {
        names.push({
          id: nodeId,
          name: node.data.name || node.data.path || nodeId,
        });
      }
    });
    return names;
  }, [hiddenNodes]);

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
      <div className='absolute top-4 left-4 bg-white rounded-lg shadow-lg border border-gray-200 p-2 z-10'>
        <label className='flex items-center gap-2 cursor-pointer'>
          <input
            type='checkbox'
            checked={showAllRelations}
            onChange={(e) => setShowAllRelations(e.target.checked)}
            className='w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500'
          />
          <span className='text-sm text-gray-700 font-medium'>
            Show All relations
          </span>
        </label>
      </div>
      {hiddenNodeNames.length > 0 && (
        <div className='absolute bottom-4 left-4 bg-white rounded-lg shadow-lg border border-gray-200 p-2 z-10 max-w-md'>
          <div className='text-xs font-semibold text-gray-700 mb-2'>
            Hidden Nodes:
          </div>
          <div className='flex flex-wrap gap-2 max-h-56 overflow-y-auto'>
            {hiddenNodeNames.map(({ id, name }) => (
              <div
                key={id}
                className='inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full border border-gray-300'
              >
                <span className='max-w-[200px] truncate'>{name}</span>
                <button
                  onClick={() => handleShowNode(id)}
                  className='ml-1 hover:bg-gray-200 rounded-full p-0.5 transition-colors'
                  title='Show node'
                >
                  <svg
                    xmlns='http://www.w3.org/2000/svg'
                    className='h-3 w-3'
                    fill='none'
                    viewBox='0 0 24 24'
                    stroke='currentColor'
                  >
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      strokeWidth={2}
                      d='M6 18L18 6M6 6l12 12'
                    />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
