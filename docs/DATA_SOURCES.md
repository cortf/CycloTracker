# CycloTracker — Data Source Reconnaissance

**Step 1 deliverable.** Generated from live probes on **2026-07-24** via
[`scripts/probe-sources.ts`](../scripts/probe-sources.ts). Raw probe output is
in [`docs/source-probe-results.json`](./source-probe-results.json); raw response
bodies are cached under `.cache/probe/` (git-ignored). Re-run with `npm run probe`.

> **Scope reminder:** the app visualizes **reported _Cyclospora cayetanensis_
> infections by U.S. state**, focused on the **most recent ~3 months**, refreshed
> **weekly (Monday mornings)**. That recency requirement is the main filter for
> deciding which sources "make the cut" below.

---

## TL;DR — recommendation

| # | Source | Type | Verdict | Cadence | Cyclospora coverage | Recommendation |
|---|--------|------|---------|---------|---------------------|----------------|
| 1 | **CDC NNDSS Weekly Data** (`x9gk-5huc`) | Socrata JSON | ✅ structured | Weekly | 2022–2026, **16,590 rows**, state+region+national | **PRIMARY / backbone** |
| 2 | CDC NNDSS Annual Summary | HTML/CSV + frozen Socrata | ✅ structured | Annual (~2yr lag) | historical | Optional baseline; redundant w/ #1 |
| 3 | FDA CORE Outbreak Table | HTML (JS-rendered) | 🟡 scrape | ~weekly | active outbreaks only | Defer — enrichment only |
| 4 | **CDC NORS** (`5xkq-dg7x`) | Socrata JSON | ✅ structured | Annual (~2yr lag) | 1990–2023, **181 rows**, 36 states | Keep for **historical + vehicle** context |
| 5 | CDC Cyclosporiasis outbreak pages | HTML (bot-protected) | 🟡 scrape | per-outbreak | 2018–present, prose | Defer — reference only |
| 6 | State DOH ×6 (TX/FL/GA/NY/WI/IL) | HTML/PDF/dashboard | 🟡 scrape | Annual | none machine-readable | **Defer** — see §6 |
| 7 | CSTE position statements | PDF/HTML | 🟡 scrape | as-adopted | n/a | Reference only (comparability) |
| 8 | **Census ACS1 population** | JSON | ✅ structured (key wired) | Annual | denominator, 52 rows | **Per-100k rates** |

**Proposed for the initial build:** ingest **#1 (backbone)** + **#8 (denominator)**;
attach **#4 (NORS)** for historical/outbreak-vehicle provenance. Everything else is
deferred to enrichment because it is either unstructured, bot-protected, redundant
with #1, or too stale for a 3-month window.

**Two decisions I need from you at this checkpoint** — see [§ Decisions](#decisions-for-you).

---

## 1. CDC NNDSS Weekly Data — `x9gk-5huc` ✅ **PRIMARY**

- **URL (data):** `https://data.cdc.gov/resource/x9gk-5huc.json`
- **URL (human):** https://data.cdc.gov/NNDSS/NNDSS-Weekly-Data/x9gk-5huc
- **Format:** Socrata SODA 2.1 — JSON, CSV, or GeoJSON. Full query grammar
  (`$where`, `$select`, `$group`, `$limit`, `$offset`).
- **Provider / attribution:** CDC Office of Public Health Data, Surveillance, and Technology.
- **License / terms:** U.S. federal public-domain data under the
  [data.cdc.gov terms](https://www.cdc.gov/other/agencymaterials.html). The Socrata
  `license` field is empty; NNDSS is publicly redistributable. No API key required
  (a free Socrata app token raises rate limits — recommended for the cron).
- **Update cadence:** Weekly by MMWR week. Rows last updated **2026-07-22**; latest
  data is **MMWR week 28 of 2026**. CDC posts the prior week midweek, so a
  **Monday-morning cron reliably captures the most recent finalized week.**
- **Coverage:** **2022–2026**, **16,590** Cyclosporiasis rows, **140** distinct
  reporting areas.

**Fields we care about:**

| field | meaning | use |
|-------|---------|-----|
| `states` | Reporting Area | join → FIPS (state name; no FIPS in feed) |
| `year` | Current MMWR year | time axis |
| `week` | MMWR week (1–53) | time axis |
| `label` | disease (`Cyclosporiasis`) | filter |
| `m1` / `m1_flag` | **current-week count** / flag | **sum over last ~13 weeks = 3-month count** |
| `m2` / `m2_flag` | previous 52-week max | context |
| `m3` / `m3_flag` | **cumulative YTD, current year** | year-to-date totals |
| `m4` / `m4_flag` | cumulative YTD, prior year | year-over-year |
| `geocode`, `location1/2` | geo helpers | mapping aid |

**Sample record (verified):**
```json
{ "states": "U.S. Residents", "year": "2026", "week": "1", "label": "Cyclosporiasis",
  "m1": "3.0", "m2": "470.0", "m3": "3.0", "m4": "4.0",
  "location2": "U.S. Residents", "sort_order": "20260101891" }
```

**Critical caveats (drive Steps 2–4):**
- **`states` is heterogeneous:** 50 states + DC + territories **plus census regions**
  ("New England", "Middle Atlantic", …) **plus national** ("U.S. Residents"). The
  140 distinct values also include **casing variants** (`ALABAMA` vs `Alabama`) from
  format changes across years. Normalization must whitelist true jurisdictions and
  drop regional/national aggregates.
- **No FIPS** — we map state name → FIPS during normalization (seeded in Step 2).
- **Flags encode the "zero vs missing" distinction we need:** `-` = *no reported
  cases* (a real zero), `N`/`NN` = *not notifiable* in that jurisdiction, `U` =
  *unavailable*, `NC`/`NP` = *not calculated / not published*. This is exactly how
  we honor "distinguish zero cases from no data" — **never** treat a blank/`U` as 0.
- Values are **provisional** and revised in later weeks; the append-only
  `raw_ingests` table + re-runnable normalization (Step 3) handle this correctly.
- Counts are **surveillance case reports**, not lab-confirmed-only and not
  outbreak-linked — a different unit than NORS/FDA (§3–4).

**Why it's the backbone:** it is the only source that is simultaneously
state-level, weekly, current-year, machine-readable, and license-clean — it alone
satisfies the 3-month + weekly-refresh requirement.

---

## 2. CDC NNDSS Annual Summary Tables — optional baseline

- **URL:** https://www.cdc.gov/nndss/data-statistics/index.html (plus per-year
  frozen "NNDSS - Table ..." Socrata datasets).
- **Format:** MMWR HTML/CSV; historical Socrata snapshots.
- **Cadence:** Annual, finalized **~2 years** after the reporting year.
- **Assessment:** For a 3-month window this is **redundant with #1's `m3`
  cumulative-YTD** column. Keep only if you later want a multi-year baseline for
  context. Not ingested initially.

---

## 3. FDA CORE Outbreak Investigation Table — 🟡 defer (enrichment)

- **URL:** https://www.fda.gov/food/outbreaks-foodborne-illness/investigations-foodborne-illness-outbreaks
- **Format:** HTML, **client-rendered** table; 22 `/media/<id>/download` per-outbreak
  PDF advisories. HTTP 200 but no reliable static/JSON feed.
- **Cadence:** Updated as investigations progress (~weekly).
- **Coverage / unit:** **Active FDA-led outbreaks only**, at the **outbreak level**
  (product + etiology + affected-state list + case count), *not* per-state
  surveillance counts. E.g. the current July-2026 Cyclospora/iceberg-lettuce
  investigation lists IN, KY, MI, OH, WV.
- **Assessment:** Useful later to annotate the map with "active outbreak" context,
  but it's a different unit and needs headless scraping. **Defer.**

---

## 4. CDC NORS (National Outbreak Reporting System) — `5xkq-dg7x` ✅ keep for context

- **URL (data):** `https://data.cdc.gov/resource/5xkq-dg7x.json`
- **Format:** Socrata JSON/CSV.
- **License:** **Public Domain, U.S. Government** (explicit).
- **Cadence:** Annual bulk refresh; rows last updated **2024-12-20**.
- **Coverage:** **1990–2023**, **181** Cyclospora outbreak rows, **36** states.
- **Fields we care about:** `year`, `month`, `state`, `primary_mode`, `etiology`,
  `etiology_status`, `setting`, `illnesses`, `hospitalizations`, `deaths`,
  `food_vehicle`, `food_contaminated_ingredient`, `ifsac_category`.
- **Sample record (verified):**
  ```json
  { "year": "2023", "month": "2", "state": "Texas", "primary_mode": "Food",
    "etiology": "Cyclospora cayetanensis", "etiology_status": "Confirmed",
    "setting": "Grocery store/bakery/deli/convenience store",
    "illnesses": "110", "hospitalizations": "9" }
  ```
- **Assessment:** **Outbreak-level illness counts, lagging ~2 years** (latest = 2023).
  Wrong unit and too stale for the 3-month map, but **valuable for provenance**:
  historical baselines and food-vehicle attribution ("linked to basil / cilantro /
  salad"). Ingest into a **separate outbreak table**, never merged into the weekly
  per-state case counts.

---

## 5. CDC Cyclosporiasis Outbreak Investigation pages — 🟡 reference only

- **URL:** https://www.cdc.gov/cyclosporiasis/outbreaks/index.html
- **Format:** HTML. **Akamai bot protection** returns intermittent 403s (a plain
  `HEAD` succeeded; a full `GET` with a browser UA was blocked) — **unreliable for
  automated fetch**. State breakdowns appear **in prose**, not a table.
- **Cadence:** per-outbreak / annual.
- **Assessment:** Human reference for methodology/caveats. **Not ingested.**

---

## 6. State Health Departments (secondary gap-fillers) — 🟡 defer all

Probed all six named states. **None expose a machine-readable cyclosporiasis feed.**
The NY open-data portal (`health.data.ny.gov`) was searched directly and returned
**0 cyclosporiasis datasets** (the "NY Socrata dataset" that surfaced in a federated
search was actually Cambridge, MA city data — excluded).

| State | URL | HTTP | Format | Feasibility |
|-------|-----|------|--------|-------------|
| Texas DSHS | dshs.texas.gov/notifiable-conditions | 200 | JS-rendered HTML | low |
| Florida CHARTS | flhealthcharts.gov (rdPage.aspx) | 200 | ASP.NET dashboard (session/POST) | very low |
| Georgia OASIS | oasis.state.ga.us | 200 | interactive query tool | very low |
| New York DOH | health.ny.gov/statistics/diseases/communicable | 403 | HTML/PDF, bot-protected | low |
| Wisconsin DHS | dhs.wisconsin.gov/disease/cyclosporiasis.htm | 200 | HTML narrative | low |
| Illinois DPH | dph.illinois.gov …/diseases-a-z-list | 200 | HTML index | low |

**Assessment:** All are **annual, heterogeneous, and lag NNDSS**, and each needs
bespoke HTML/PDF/dashboard scraping. For a 3-month national map their marginal value
is low and their maintenance cost is high. **Recommend deferring all six**; revisit
only if Step 4's coverage report shows a specific high-burden state that NNDSS
under-reports. (The per-source adapter Skill makes adding one later cheap.)

---

## 7. CSTE Position Statements — reference (comparability), not data

- **URL:** https://www.cste.org/page/PositionStatements
- Documents **case-definition changes** that affect year-over-year comparability.
  Feeds the **methodology page** (Step 7), **never** rendered as case data.

---

## 8. Census population (denominator) — ✅ **resolved: ACS 1-year, key wired**

- **Chosen endpoint:** `https://api.census.gov/data/2024/acs/acs1?get=NAME,B01001_001E&for=state:*`
- **Format:** JSON array-of-arrays (`[["NAME","B01001_001E","state"], ...]`).
- **Verified (2026-07-24, with key):** HTTP 200, **52 rows = 50 states + DC + PR**.
  Sample: `["Alabama","5157699","01"]`.
- **Why ACS1, not PEP as the brief suggested:** the plain PEP total-population API
  (`/pep/population`) **only publishes through Vintage 2021** — 2022/2023/2024 all
  return 404. ACS 1-year `B01001_001E` (total population) is **current (2024
  confirmed)** and covers all 50 states + DC + PR. **PEP Vintage 2021** remains a
  documented fallback if we ever need the small territories (Guam/USVI/AS/MP),
  which ACS1 (pop ≥ 65k) omits.
- **Key:** free API key **provided and stored in `.env`** (git-ignored); the probe
  auto-loads it. Denominator only, fetched once/year and cached — never a case source.
- **Cadence:** Annual (ACS 1-year, ~1-year lag). Fine for a slow-moving denominator.

---

## Data-model implications for Step 2

- `case_records` (the mapped numbers) come **only from #1 NNDSS weekly**, keyed by
  `state_fips + year + week`, storing `m1` (weekly) and `m3` (cumulative) with their
  flags and a `source_id`.
- **Every rendered number stays traceable to `source_id`** (constraint) — even
  "zero" carries the flag that proves it's a real zero, not missing.
- NORS (#4) lands in a **separate `outbreak_records`** table (different unit) — for
  provenance/vehicle context, not summed into case counts.
- `state_population` seeded from #8 for rates.
- Region/national rows and casing variants from #1 are **filtered during
  normalization**, not stored as states.

---

## <a id="decisions-for-you"></a>Decisions — RESOLVED (2026-07-24)

1. **Denominator / Census key** — ✅ Key provided and wired into `.env`. Using
   **ACS 1-year** (`B01001_001E`) as the denominator since PEP's population API
   stops at Vintage 2021 (see §8). Per-100k rates are in scope from the start.
2. **State DOH sources** — ✅ **Defer all six.** NNDSS weekly is the single source
   of truth for per-state counts. The per-source adapter Skill (Claude-native
   requirement) makes adding any of them back cheap if Step-4 coverage exposes a gap.

Secondary (confirmed): NORS ingested for historical/outbreak context only, in a
separate table; FDA CORE + CDC/CSTE pages are reference-only, not ingested.

**Sources that make the cut for the initial build:** #1 NNDSS weekly (case
backbone) · #8 ACS1 population (denominator) · #4 NORS (separate outbreak/context
table). Everything else deferred but easy to add later.

---

## Reproduce

```bash
npm install
npm run probe                      # uses .cache/ ; delete .cache/ to force refetch
CENSUS_API_KEY=xxxx npm run probe  # also exercises the Census endpoint
```
