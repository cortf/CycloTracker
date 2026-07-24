/**
 * geo.ts — SERVER ONLY. Project the us-atlas states TopoJSON (geographic
 * coordinates) through Albers USA, fitted to a 975×610 viewport, into per-state
 * SVG paths + centroids. geoAlbersUsa handles the AK/HI insets and drops areas
 * outside the 50 states + DC (territories), which the map doesn't draw anyway.
 * Path coordinates are rounded to whole pixels to keep the SSR payload small.
 */
import { geoAlbersUsa, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import usAtlas from "us-atlas/states-10m.json";
import { MAP_HEIGHT, MAP_WIDTH, type StateGeo } from "./map-types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const topology = usAtlas as any;

let cache: StateGeo[] | null = null;

export function getStateGeo(): StateGeo[] {
  if (cache) return cache;
  const fc = feature(topology, topology.objects.states) as unknown as {
    type: "FeatureCollection";
    features: Array<{ id: string; properties: { name: string } }>;
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const projection = geoAlbersUsa().fitSize([MAP_WIDTH, MAP_HEIGHT], fc as any);
  const path = geoPath(projection);

  cache = fc.features
    .map((f) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const raw = path(f as any) ?? "";
      const d = raw.replace(/\d+\.\d+/g, (m) => String(Math.round(Number(m))));
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const [cx, cy] = path.centroid(f as any);
      return { fips: f.id, name: f.properties.name, d, cx: Math.round(cx), cy: Math.round(cy) };
    })
    // Drop anything Albers USA can't place (territories) — not mapped.
    .filter((s) => s.d !== "" && Number.isFinite(s.cx) && Number.isFinite(s.cy));
  return cache;
}
