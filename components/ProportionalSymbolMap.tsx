"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { select } from "d3-selection";
import {
  zoom,
  zoomIdentity,
  type D3ZoomEvent,
  type ZoomBehavior,
  type ZoomTransform,
} from "d3-zoom";
import { stateAriaLabel } from "../lib/format";
import {
  MAP_HEIGHT,
  MAP_WIDTH,
  type StateEntry,
  type StateGeo,
} from "../lib/map-types";
import {
  dodgeSymbols,
  MIN_VISIBLE_RADIUS,
  type DodgeInput,
} from "../lib/map-utils";

export interface ActiveAnchor {
  fips: string;
  rect: DOMRect;
}

interface Props {
  geo: StateGeo[];
  byFips: Map<string, StateEntry>;
  radius: (value: number) => number;
  activeFips: string | null;
  onActivate: (anchor: ActiveAnchor | null) => void;
}

const MIN_ZOOM = 1;
const MAX_ZOOM = 8;
const ZOOM_STEP = 1.6; // button/keyboard multiplier

export function ProportionalSymbolMap({
  geo,
  byFips,
  radius,
  activeFips,
  onActivate,
}: Props) {
  // Symbols only for states with a positive value; dodge the overlaps.
  const nodes = useMemo(() => {
    const inputs: DodgeInput[] = [];
    for (const g of geo) {
      const e = byFips.get(g.fips);
      if (!e || e.value === null || e.value <= 0) continue;
      inputs.push({
        fips: g.fips,
        name: g.name,
        cx: g.cx,
        cy: g.cy,
        r: Math.max(radius(e.value), MIN_VISIBLE_RADIUS),
      });
    }
    // Render large circles first so small ones stay on top and clickable.
    return dodgeSymbols(inputs).sort((a, b) => b.r - a.r);
  }, [geo, byFips, radius]);

  const svgRef = useRef<SVGSVGElement>(null);
  const zoomRef = useRef<ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const panningRef = useRef(false);
  const [transform, setTransform] = useState<ZoomTransform>(zoomIdentity);
  const [panning, setPanning] = useState(false);

  // Wire up d3-zoom once. Because the SVG has a viewBox, the zoom transform is
  // expressed in the same 975×610 coordinate space as the content group, so it
  // applies directly with no unit conversion.
  useEffect(() => {
    const svgEl = svgRef.current;
    if (!svgEl) return;
    const z = zoom<SVGSVGElement, unknown>()
      .scaleExtent([MIN_ZOOM, MAX_ZOOM])
      .translateExtent([
        [0, 0],
        [MAP_WIDTH, MAP_HEIGHT],
      ])
      .on("start", () => {
        panningRef.current = true;
        setPanning(true);
        onActivate(null); // hide any open tooltip while the view moves
      })
      .on("zoom", (event: D3ZoomEvent<SVGSVGElement, unknown>) =>
        setTransform(event.transform),
      )
      .on("end", () => {
        panningRef.current = false;
        setPanning(false);
      });
    select(svgEl).call(z);
    zoomRef.current = z;
    return () => {
      select(svgEl).on(".zoom", null);
    };
  }, [onActivate]);

  const scaleBy = (factor: number) => {
    const svgEl = svgRef.current;
    if (svgEl && zoomRef.current)
      zoomRef.current.scaleBy(select(svgEl), factor);
  };
  const resetZoom = () => {
    const svgEl = svgRef.current;
    if (svgEl && zoomRef.current)
      zoomRef.current.transform(select(svgEl), zoomIdentity);
  };

  // Ignore hover/focus activation triggered mid-drag so the tooltip doesn't flicker.
  const activate =
    (fips: string) => (e: React.FocusEvent | React.MouseEvent) => {
      if (panningRef.current) return;
      onActivate({
        fips,
        rect: (e.currentTarget as SVGElement).getBoundingClientRect(),
      });
    };
  const clear = () => onActivate(null);

  const zoomed = transform.k > MIN_ZOOM;

  return (
    <div className="map-stage">
      <svg
        ref={svgRef}
        className="map-svg"
        data-panning={panning}
        data-zoomed={zoomed}
        viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
        role="group"
        aria-label="Proportional symbol map of reported Cyclospora cases by U.S. state. Circle area is proportional to the value; states with no data are shown with a hatched fill. Scroll or use the on-screen controls to zoom, and drag to pan. A data table with the same figures follows."
      >
        <defs>
          <pattern
            id="nodata-hatch"
            width="6"
            height="6"
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(45)"
          >
            <rect className="hatch-bg" width="6" height="6" />
            <line className="hatch-line" x1="0" y1="0" x2="0" y2="6" />
          </pattern>
        </defs>

        {/* Everything zoomable lives in one transformed group. */}
        <g transform={transform.toString()}>
          {/* State outlines. no-data states get the hatch fill. */}
          <g aria-hidden="true">
            {geo.map((g) => {
              const cls = byFips.get(g.fips)?.classification;
              return (
                <path
                  key={g.fips}
                  className={`state-path${cls === "no-data" ? " state-path--nodata" : ""}`}
                  d={g.d}
                />
              );
            })}
          </g>

          {/* Leader lines from displaced symbols back to their state centroid. */}
          <g aria-hidden="true">
            {nodes
              .filter((n) => n.displaced)
              .map((n) => (
                <line
                  key={`l-${n.fips}`}
                  className="leader"
                  x1={n.x}
                  y1={n.y}
                  x2={n.x0}
                  y2={n.y0}
                />
              ))}
          </g>

          {/* Symbols: focusable, labelled, with a generous invisible hit target. */}
          {nodes.map((n) => {
            const e = byFips.get(n.fips)!;
            return (
              <g key={n.fips}>
                <circle
                  className="symbol-hit"
                  cx={n.x}
                  cy={n.y}
                  r={Math.max(n.r, 11)}
                  tabIndex={0}
                  role="button"
                  aria-label={stateAriaLabel(
                    n.name,
                    e.count,
                    e.rate,
                    e.classification,
                    e.sources,
                  )}
                  onMouseEnter={activate(n.fips)}
                  onMouseLeave={clear}
                  onFocus={activate(n.fips)}
                  onBlur={clear}
                  onKeyDown={(ev) => {
                    if (ev.key === "Escape")
                      (ev.currentTarget as SVGElement).blur();
                  }}
                />
                <circle
                  className="symbol"
                  cx={n.x}
                  cy={n.y}
                  r={n.r}
                  data-active={activeFips === n.fips}
                  pointerEvents="none"
                />
              </g>
            );
          })}
        </g>
      </svg>

      <div
        className="zoom-controls"
        role="group"
        aria-label="Map zoom controls"
      >
        <button
          type="button"
          aria-label="Zoom in"
          onClick={() => scaleBy(ZOOM_STEP)}
          disabled={transform.k >= MAX_ZOOM}
        >
          <span aria-hidden="true">+</span>
        </button>
        <button
          type="button"
          aria-label="Zoom out"
          onClick={() => scaleBy(1 / ZOOM_STEP)}
          disabled={!zoomed}
        >
          <span aria-hidden="true">−</span>
        </button>
        <button
          type="button"
          className="zoom-reset"
          onClick={resetZoom}
          disabled={!zoomed}
        >
          Reset
        </button>
      </div>
    </div>
  );
}
