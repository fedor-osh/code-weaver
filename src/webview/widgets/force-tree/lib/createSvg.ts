import * as d3 from "d3";

export interface SvgConfig {
  width: number;
  height: number;
}

export function createSvg(
  element: SVGSVGElement,
  config: SvgConfig
): {
  svg: d3.Selection<SVGSVGElement, unknown, null, undefined>;
  container: d3.Selection<SVGGElement, unknown, null, undefined>;
} {
  const { width, height } = config;

  const svg = d3
    .select(element)
    .attr("width", width)
    .attr("height", height)
    .attr("viewBox", [-width / 2, -height / 2, width, height])
    .attr("style", "max-width: 100%; height: auto;");

  const container = svg.append("g").attr("class", "zoom-container");

  return { svg, container };
}

