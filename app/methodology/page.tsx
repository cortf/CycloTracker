import type { Metadata } from "next";
import { buildSourcesResponse } from "../../lib/api/sources";

export const metadata: Metadata = { title: "Methodology · CycloTracker" };
export const dynamic = "force-dynamic";

export default function Methodology() {
  const sources = buildSourcesResponse().sources;
  return (
    <main className="app doc">
      <a className="back" href="/">← Back to the map</a>
      <h1>Methodology &amp; caveats</h1>
      <p>
        CycloTracker maps <strong>reported <i>Cyclospora cayetanensis</i> cases by U.S. state</strong>, focused on
        the most recent ~3 months and refreshed weekly. This page explains exactly what the numbers are — and,
        just as importantly, what they are not.
      </p>

      <h2>What is counted</h2>
      <p>
        Case counts come from the CDC <strong>NNDSS weekly tables</strong> (nationally notifiable disease
        surveillance). These are <strong>provisional</strong> reports by week and jurisdiction, revised in later
        weeks. They are surveillance case reports — <em>not</em> lab-confirmed-only figures and{" "}
        <em>not</em> outbreak-linked counts (those are a different unit; see NORS below).
      </p>

      <h2>The 3-month window</h2>
      <p>
        The default view sums each state&apos;s weekly counts over the latest 13 MMWR weeks present in the data.
        The year selector instead shows a year&apos;s cumulative year-to-date total. A state can show data in one
        view and not the other.
      </p>

      <h2>Zero vs. no data — never conflated</h2>
      <p>
        A blank is never treated as a zero. Each state-week carries a status:
      </p>
      <ul>
        <li><strong>reporting</strong> — a real count (may be zero, shown as an empty state, no symbol);</li>
        <li><strong>no data</strong> — the disease is flagged not-notifiable (<code>N</code>) or unavailable
          (<code>U</code>) for that jurisdiction. These states are drawn with a <strong>hatched fill</strong>,
          never a zero-sized symbol. In the current window this affects Idaho, Mississippi, and Pennsylvania.</li>
      </ul>

      <h2>Comparability caveats</h2>
      <p>
        Cyclosporiasis case definitions change over time (see CSTE position statements), and reporting
        completeness varies by state and season. Year-over-year and state-to-state comparisons should be read
        with that in mind. Provisional weekly counts are revised. Domestically acquired summer outbreaks (often
        produce-linked) drive large, real spikes — the current Ohio/Michigan surge is one.
      </p>

      <h2>Reconciliation &amp; precedence</h2>
      <p>
        Where multiple sources overlap, the value is chosen by a documented precedence order
        (state DOH &gt; NNDSS annual &gt; NNDSS weekly); only sources with a usable number can win, and
        disagreements are flagged rather than averaged. Today NNDSS weekly is the single enabled case source, so
        nothing overlaps yet — the layer exists so additional sources slot in cleanly.
      </p>

      <h2>Rates (per 100,000)</h2>
      <p>
        Per-capita rates use U.S. Census <strong>ACS 1-year</strong> population (variable
        <code> B01001_001E</code>). The brief called for the Census PEP API, but PEP&apos;s population endpoint
        stops at Vintage 2021; ACS 1-year is current (2024). A rate is only shown where population is known —
        never fabricated.
      </p>

      <h2>Symbol encoding</h2>
      <p>
        Circle <strong>area</strong> is proportional to the value (radius scales with the square root) — so a
        state with 4× the cases gets a circle 2× the radius, not 4×. New York City is reported separately by
        NNDSS and is summed into New York State. Territories are stored but not drawn (Albers USA shows the 50
        states + DC).
      </p>

      <h2>What we never do</h2>
      <ul>
        <li>Never fabricate or interpolate case data — missing is missing.</li>
        <li>Every rendered number is traceable to a source (see the table below and each tooltip).</li>
        <li>Never scale symbols by radius; never render &quot;no data&quot; as zero.</li>
      </ul>

      <h2>Sources</h2>
      <table className="provenance-table">
        <thead>
          <tr>
            <th scope="col">Source</th>
            <th scope="col">Role</th>
            <th scope="col">Status</th>
            <th scope="col">License</th>
          </tr>
        </thead>
        <tbody>
          {sources.map((s) => (
            <tr key={s.key}>
              <th scope="row">{s.url ? <a href={s.url} target="_blank" rel="noreferrer">{s.name}</a> : s.name}</th>
              <td>{s.category}</td>
              <td>{s.enabled ? "in use" : "deferred"}</td>
              <td className="lic">{s.license ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
