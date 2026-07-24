"use client";

import { useMemo } from "react";
import { stateAriaLabel } from "../lib/format";
import { MAP_HEIGHT, MAP_WIDTH, type StateEntry, type StateGeo } from "../lib/map-types";
import { dodgeSymbols, MIN_VISIBLE_RADIUS, type DodgeInput } from "../lib/map-utils";

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

export function ProportionalSymbolMap({ geo, byFips, radius, activeFips, onActivate }: Props) {
  // Symbols only for states with a positive value; dodge the overlaps.
  const nodes = useMemo(() => {
    const inputs: DodgeInput[] = [];
    for (const g of geo) {
      const e = byFips.get(g.fips);
      if (!e || e.value === null || e.value <= 0) continue;
      inputs.push({ fips: g.fips, name: g.name, cx: g.cx, cy: g.cy, r: Math.max(radius(e.value), MIN_VISIBLE_RADIUS) });
    }
    // Render large circles first so small ones stay on top and clickable.
    return dodgeSymbols(inputs).sort((a, b) => b.r - a.r);
  }, [geo, byFips, radius]);

  const activate = (fips: string) => (e: React.FocusEvent | React.MouseEvent) => {
    onActivate({ fips, rect: (e.currentTarget as SVGElement).getBoundingClientRect() });
  };
  const clear = () => onActivate(null);

  return (
    <svg
      className="map-svg"
      viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
      role="group"
      aria-label="Proportional symbol map of reported Cyclospora cases by U.S. state. Circle area is proportional to the value; states with no data are shown with a hatched fill. A data table with the same figures follows."
    >
      <defs>
        <pattern id="nodata-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect className="hatch-bg" width="6" height="6" />
          <line className="hatch-line" x1="0" y1="0" x2="0" y2="6" />
        </pattern>
      </defs>

      {/* State outlines. no-data states get the hatch fill. */}
      <g aria-hidden="true">
        {geo.map((g) => {
          const cls = byFips.get(g.fips)?.classification;
          return (
            <path key={g.fips} className={`state-path${cls === "no-data" ? " state-path--nodata" : ""}`} d={g.d} />
          );
        })}
      </g>

      {/* Leader lines from displaced symbols back to their state centroid. */}
      <g aria-hidden="true">
        {nodes.filter((n) => n.displaced).map((n) => (
          <line key={`l-${n.fips}`} className="leader" x1={n.x} y1={n.y} x2={n.x0} y2={n.y0} />
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
              aria-label={stateAriaLabel(n.name, e.count, e.rate, e.classification, e.sources)}
              onMouseEnter={activate(n.fips)}
              onMouseLeave={clear}
              onFocus={activate(n.fips)}
              onBlur={clear}
              onKeyDown={(ev) => {
                if (ev.key === "Escape") (ev.currentTarget as SVGElement).blur();
              }}
            />
            <circle className="symbol" cx={n.x} cy={n.y} r={n.r} data-active={activeFips === n.fips} pointerEvents="none" />
          </g>
        );
      })}
    </svg>
  );
}
