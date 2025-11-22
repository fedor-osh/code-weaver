import * as d3 from "d3";

export interface ZoomCallbacks {
  onZoom: (transform: d3.ZoomTransform) => void;
}

export function createZoomBehavior(
  svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
  container: d3.Selection<SVGGElement, unknown, null, undefined>,
  callbacks: ZoomCallbacks
): d3.ZoomBehavior<SVGSVGElement, unknown> {
  const zoom = d3
    .zoom<SVGSVGElement, unknown>()
    .scaleExtent([0.1, 4])
    .on("zoom", (event) => {
      container.attr("transform", event.transform.toString());
      callbacks.onZoom(event.transform);
    });

  svg.call(zoom);
  return zoom;
}

