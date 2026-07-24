/**
 * Placeholder home page. The proportional symbol map lands here in Step 6.
 * For now it just points at the Step-5 API endpoints.
 */
export default function Home() {
  return (
    <main style={{ fontFamily: "system-ui, sans-serif", maxWidth: 720, margin: "3rem auto", padding: "0 1rem", lineHeight: 1.5 }}>
      <h1>CycloTracker</h1>
      <p>Reported <i>Cyclospora cayetanensis</i> infections by U.S. state. The map arrives in Step 6.</p>
      <h2>API</h2>
      <ul>
        <li><code>GET /api/cases</code> — 3-month per-state totals (add <code>?year=2025</code>, <code>?metric=rate</code>)</li>
        <li><code>GET /api/states/[fips]</code> — drill-down, e.g. <code><a href="/api/states/39">/api/states/39</a></code> (Ohio)</li>
        <li><code>GET /api/sources</code> — <a href="/api/sources">provenance</a></li>
      </ul>
    </main>
  );
}
