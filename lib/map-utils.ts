/**
 * map-utils.ts — pure symbol-map math (radius scale, legend values, dodge).
 * Unit-tested. Uses d3-scale/d3-force but no DOM, so it runs in tests too.
 *
 * CRITICAL: radius scales with sqrt(value) so AREA is proportional to value.
 * Never scale radius linearly with value — that exaggerates big states.
 */
import { forceCollide, forceSimulation, forceX, forceY } from "d3-force";
import { scaleSqrt } from "d3-scale";

export const MAX_RADIUS = 44;
export const MIN_VISIBLE_RADIUS = 2;

/** sqrt scale: area ∝ value. domain [0, max] -> radius [0, MAX_RADIUS]. */
export function makeRadiusScale(maxValue: number) {
  return scaleSqrt().domain([0, Math.max(maxValue, 1)]).range([0, MAX_RADIUS]);
}

function niceNum(v: number): number {
  if (v <= 0) return 0;
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  const f = v / p;
  const n = f >= 5 ? 5 : f >= 2.5 ? 2.5 : f >= 2 ? 2 : 1;
  return n * p;
}

/** Up to three distinct "nice" reference values for the nested-circle legend. */
export function niceLegendValues(maxValue: number): number[] {
  if (maxValue <= 0) return [];
  const top = niceNum(maxValue);
  const candidates = [top, niceNum(top / 4), niceNum(top / 16)].map((v) =>
    v >= 1 ? Math.round(v) : Number(v.toFixed(2)),
  );
  return [...new Set(candidates)].filter((v) => v > 0).sort((a, b) => b - a);
}

export interface DodgeInput {
  fips: string;
  name: string;
  cx: number;
  cy: number;
  r: number;
}
export interface SymbolNode {
  fips: string;
  name: string;
  x0: number; // true centroid
  y0: number;
  r: number;
  x: number; // dodged position
  y: number;
  displaced: boolean;
}

/**
 * Nudge overlapping symbols apart with a short, deterministic force simulation
 * seeded at each state's centroid. Symbols moved noticeably get a leader line
 * back to their state (drawn by the map). Handles the dense Northeast cluster.
 */
export function dodgeSymbols(input: DodgeInput[], leaderThreshold = 4): SymbolNode[] {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const nodes: any[] = input.map((n) => ({ ...n, x: n.cx, y: n.cy }));
  const sim = forceSimulation(nodes)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .force("x", forceX<any>((d) => d.cx).strength(0.6))
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .force("y", forceY<any>((d) => d.cy).strength(0.6))
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .force("collide", forceCollide<any>((d) => d.r + 1.5).strength(1).iterations(3))
    .stop();
  for (let i = 0; i < 160; i++) sim.tick();
  return nodes.map((d) => {
    const dist = Math.hypot(d.x - d.cx, d.y - d.cy);
    return { fips: d.fips, name: d.name, x0: d.cx, y0: d.cy, r: d.r, x: d.x, y: d.y, displaced: dist > leaderThreshold };
  });
}
