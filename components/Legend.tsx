"use client";

import { fmtCount } from "../lib/format";

interface Props {
  radius: (value: number) => number;
  values: number[]; // descending nice reference values
  metricLabel: string;
  rateMetric: boolean;
}

/** Nested-circle size legend + a no-data swatch. Area ∝ value (matches the map). */
export function Legend({ radius, values, metricLabel, rateMetric }: Props) {
  if (!values.length) return null;
  const maxR = radius(values[0]!);
  const pad = 4;
  const labelX = maxR * 2 + 12;
  const W = labelX + 56;
  const H = maxR * 2 + pad * 2;
  const cx = maxR + pad;
  const baseline = H - pad;
  const fmt = (v: number) => (rateMetric ? String(v) : fmtCount(v));

  return (
    <div className="legend">
      <div>
        <div className="legend-title">{metricLabel} — circle area ∝ value</div>
        <svg
          width={W}
          height={H + 4}
          role="img"
          aria-label={`Size legend: circle area is proportional to ${metricLabel}. Reference values: ${values.map(fmt).join(", ")}.`}
        >
          {values.map((v) => {
            const r = radius(v);
            const topY = baseline - 2 * r;
            return (
              <g key={v}>
                <circle cx={cx} cy={baseline - r} r={r} fill="none" stroke="var(--muted)" />
                <line x1={cx} y1={topY} x2={labelX - 4} y2={topY} stroke="var(--hairline)" />
                <text x={labelX} y={topY + 4} fontSize="11">{fmt(v)}</text>
              </g>
            );
          })}
        </svg>
      </div>
      <div>
        <div className="legend-title">Coverage</div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.45rem", marginTop: "0.4rem" }}>
          <span className="nodata-swatch" aria-hidden="true" />
          <span>no data (not notifiable)</span>
        </div>
        <div style={{ color: "var(--muted)", fontSize: "0.75rem", marginTop: "0.25rem" }}>
          empty state = 0 reported
        </div>
      </div>
    </div>
  );
}
