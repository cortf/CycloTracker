/**
 * Seed data for the `sources` registry, from Step-1 reconnaissance
 * (see docs/DATA_SOURCES.md).
 *
 * `precedence` orders conflict resolution in Step 4 (higher wins), matching the
 * brief's rule: state DOH > NNDSS annual > NNDSS weekly. Deferred sources are
 * seeded disabled so they're documented and cheap to switch on later.
 */
export interface SeedSource {
  key: string;
  name: string;
  url: string | null;
  category: "primary" | "secondary" | "denominator" | "reference";
  format: string | null;
  license: string | null;
  updateCadence: string | null;
  precedence: number;
  enabled: boolean;
  notes: string | null;
}

export const SEED_SOURCES: SeedSource[] = [
  // ---- Enabled: the sources that made the cut ----
  {
    key: "nndss-weekly",
    name: "CDC NNDSS Weekly Data",
    url: "https://data.cdc.gov/resource/x9gk-5huc.json",
    category: "primary",
    format: "Socrata SODA 2.1 JSON",
    license: "U.S. Government public domain (data.cdc.gov terms)",
    updateCadence: "Weekly (MMWR week)",
    precedence: 60,
    enabled: true,
    notes:
      "Case backbone. m1=current week, m3=cumulative YTD; flags encode zero-vs-missing. State-level, 2022-present.",
  },
  {
    key: "census-acs1",
    name: "Census ACS 1-year population",
    url: "https://api.census.gov/data/2024/acs/acs1?get=NAME,B01001_001E&for=state:*",
    category: "denominator",
    format: "JSON array-of-arrays",
    license: "U.S. Government public domain",
    updateCadence: "Annual",
    precedence: 0,
    enabled: true,
    notes: "Denominator for per-100k rates (B01001_001E). PEP caps at Vintage 2021, so ACS1 is used.",
  },
  {
    key: "nors",
    name: "CDC NORS (National Outbreak Reporting System)",
    url: "https://data.cdc.gov/resource/5xkq-dg7x.json",
    category: "primary",
    format: "Socrata SODA 2.1 JSON",
    license: "Public Domain, U.S. Government",
    updateCadence: "Annual bulk refresh (~2yr lag)",
    precedence: 40,
    enabled: true,
    notes: "Outbreak-level context (illnesses + food vehicle), separate from case counts. Not merged into case_records totals.",
  },

  // ---- Deferred (seeded disabled for provenance; enable via the adapter Skill) ----
  {
    key: "nndss-annual",
    name: "CDC NNDSS Annual Summary Tables",
    url: "https://www.cdc.gov/nndss/data-statistics/index.html",
    category: "primary",
    format: "MMWR HTML/CSV + frozen Socrata snapshots",
    license: "U.S. Government public domain",
    updateCadence: "Annual (~2yr lag)",
    precedence: 80,
    enabled: false,
    notes: "Redundant with nndss-weekly m3 for a 3-month window; optional multi-year baseline.",
  },
  {
    key: "fda-core",
    name: "FDA CORE Outbreak Investigation Table",
    url: "https://www.fda.gov/food/outbreaks-foodborne-illness/investigations-foodborne-illness-outbreaks",
    category: "primary",
    format: "HTML (client-rendered)",
    license: "U.S. Government public domain",
    updateCadence: "~Weekly (as investigations progress)",
    precedence: 35,
    enabled: false,
    notes: "Outbreak-level, JS-rendered; enrichment only.",
  },
  {
    key: "cdc-cyclo-outbreaks",
    name: "CDC Cyclosporiasis Outbreak Investigation pages",
    url: "https://www.cdc.gov/cyclosporiasis/outbreaks/index.html",
    category: "reference",
    format: "HTML (bot-protected)",
    license: "U.S. Government public domain",
    updateCadence: "Per-outbreak / annual",
    precedence: 0,
    enabled: false,
    notes: "Prose state breakdowns; reference for the methodology page.",
  },
  {
    key: "cste-position",
    name: "CSTE Position Statements",
    url: "https://www.cste.org/page/PositionStatements",
    category: "reference",
    format: "PDF/HTML",
    license: "CSTE terms",
    updateCadence: "As adopted",
    precedence: 0,
    enabled: false,
    notes: "Case-definition comparability caveats. Never rendered as case data.",
  },
  {
    key: "tx-dshs",
    name: "Texas DSHS Notifiable Conditions",
    url: "https://www.dshs.texas.gov/notifiable-conditions",
    category: "secondary",
    format: "HTML/PDF",
    license: "TX DSHS terms",
    updateCadence: "Annual",
    precedence: 100,
    enabled: false,
    notes: "State DOH gap-filler; JS-rendered. Deferred.",
  },
  {
    key: "fl-charts",
    name: "Florida FLHealthCHARTS",
    url: "https://www.flhealthcharts.gov/",
    category: "secondary",
    format: "ASP.NET dashboard",
    license: "FL DOH terms",
    updateCadence: "Annual",
    precedence: 100,
    enabled: false,
    notes: "State DOH gap-filler; session/POST dashboard. Deferred.",
  },
  {
    key: "ga-oasis",
    name: "Georgia DPH OASIS",
    url: "https://oasis.state.ga.us/",
    category: "secondary",
    format: "Interactive query tool",
    license: "GA DPH terms",
    updateCadence: "Annual",
    precedence: 100,
    enabled: false,
    notes: "State DOH gap-filler. Deferred.",
  },
  {
    key: "ny-doh",
    name: "New York State DOH Communicable Disease",
    url: "https://www.health.ny.gov/statistics/diseases/communicable/",
    category: "secondary",
    format: "HTML/PDF",
    license: "NY DOH terms",
    updateCadence: "Annual",
    precedence: 100,
    enabled: false,
    notes: "No cyclosporiasis dataset on the open-data portal. Deferred.",
  },
  {
    key: "wi-dhs",
    name: "Wisconsin DHS Cyclosporiasis",
    url: "https://www.dhs.wisconsin.gov/disease/cyclosporiasis.htm",
    category: "secondary",
    format: "HTML",
    license: "WI DHS terms",
    updateCadence: "Ad hoc",
    precedence: 100,
    enabled: false,
    notes: "State DOH gap-filler; narrative. Deferred.",
  },
  {
    key: "il-dph",
    name: "Illinois DPH Diseases A-Z",
    url: "https://dph.illinois.gov/topics-services/diseases-and-conditions/diseases-a-z-list.html",
    category: "secondary",
    format: "HTML",
    license: "IL DPH terms",
    updateCadence: "Annual",
    precedence: 100,
    enabled: false,
    notes: "State DOH gap-filler. Deferred.",
  },
];
