"use client";

import { classificationText, fmtCount, fmtRate, sourceLabel } from "../lib/format";
import type { StateEntry } from "../lib/map-types";

interface Props {
  entry: StateEntry;
  anchor: DOMRect;
}

export function Tooltip({ entry, anchor }: Props) {
  const style: React.CSSProperties = { left: anchor.left + anchor.width / 2, top: anchor.top };
  const noData = entry.classification === "no-data";
  return (
    <div className="tooltip" role="status" style={style}>
      <div className="tt-name">{entry.name}</div>
      {noData ? (
        <div className="tt-nodata">No data — not notifiable in this state (not a zero).</div>
      ) : (
        <>
          <div className="tt-row"><span>Cases</span><b>{fmtCount(entry.count)}</b></div>
          <div className="tt-row"><span>Per 100k</span><b>{fmtRate(entry.rate)}</b></div>
          <div className="tt-row"><span>Status</span><b>{classificationText(entry.classification)}</b></div>
          {entry.sources.length > 0 && (
            <div className="tt-sources">Source: {entry.sources.map(sourceLabel).join(", ")}</div>
          )}
        </>
      )}
    </div>
  );
}
