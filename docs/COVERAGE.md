# CycloTracker — Data Coverage Report

Generated **2026-07-24** by [`scripts/coverage-report.ts`](../scripts/coverage-report.ts). Re-run: `npm run coverage`.

**3-month window:** the latest **13** MMWR weeks present — **2026-W16 → 2026-W28** (target 13 weeks).

## How to read this

- **Reconciliation precedence** (higher wins; only sources with a usable number can win):
  - `nndss-weekly` (precedence 60)
  Currently a single enabled case source, so nothing overlaps yet — the layer is ready for more.

- **Classification (the zero-vs-missing distinction):**
  - `✅ has-data` — at least one week in the window with count > 0
  - `⓪ zero` — has reporting weeks, but they sum to 0 (a real "no cases")
  - `⚠️ no-data` — **no** usable week (all missing / not-notifiable). **Not** the same as zero; must not render as 0.

- Counts are provisional NNDSS weekly reports; every number is traceable to a `source_id`.

## Summary

| Metric | Value |
| --- | --- |
| Mappable jurisdictions (50 states + DC) | 51 |
| — with data (>0) in window | 33 |
| — reporting zero in window | 15 |
| — **no data** in window | **3** |
| National 3-month total (sum of states) | 3920 |
| Reconciliation conflicts | 0 |
| Years available | 2022, 2023, 2024, 2025, 2026 |

## Gaps — decide how to handle before drawing the map

**no-data (3):** Idaho (ID), Mississippi (MS), Pennsylvania (PA)

**zero in window (15):** DE, DC, HI, IA, MN, MO, MT, NV, NH, NM, ND, SD, VT, WA, WY

> Recommendation: render `no-data` states in a distinct neutral style (e.g. hatched/greyed, labelled "no data"), never as a zero-sized symbol that reads as "0 cases". Render `zero` states as an explicit zero. Your call at this checkpoint.

## 3-month coverage by state

| State | 3-mo total | per 100k | weeks w/ data | class | years present |
| --- | --- | --- | --- | --- | --- |
| Ohio (OH) | 1666 | 14.02 | 13/13 | ✅ has-data | 2022, 2023, 2024, 2025, 2026 |
| Michigan (MI) | 945 | 9.32 | 13/13 | ✅ has-data | 2022, 2023, 2024, 2025, 2026 |
| New York (NY) | 274 | 1.38 | 13/13 | ✅ has-data | 2022, 2023, 2024, 2025, 2026 |
| Florida (FL) | 160 | 0.68 | 13/13 | ✅ has-data | 2022, 2023, 2024, 2025, 2026 |
| Kansas (KS) | 126 | 4.24 | 13/13 | ✅ has-data | 2022, 2023, 2024, 2025, 2026 |
| Oklahoma (OK) | 115 | 2.81 | 13/13 | ✅ has-data | 2024, 2025, 2026 |
| Colorado (CO) | 79 | 1.33 | 13/13 | ✅ has-data | 2022, 2023, 2024, 2025, 2026 |
| Maryland (MD) | 73 | 1.17 | 13/13 | ✅ has-data | 2022, 2023, 2024, 2025, 2026 |
| Virginia (VA) | 73 | 0.83 | 13/13 | ✅ has-data | 2022, 2023, 2024, 2025, 2026 |
| Georgia (GA) | 67 | 0.60 | 13/13 | ✅ has-data | 2022, 2023, 2024, 2025, 2026 |
| Nebraska (NE) | 63 | 3.14 | 13/13 | ✅ has-data | 2022, 2023, 2024, 2025, 2026 |
| Tennessee (TN) | 52 | 0.72 | 13/13 | ✅ has-data | 2022, 2023, 2024, 2025, 2026 |
| Wisconsin (WI) | 35 | 0.59 | 13/13 | ✅ has-data | 2022, 2023, 2024, 2025, 2026 |
| California (CA) | 30 | 0.08 | 13/13 | ✅ has-data | 2022, 2023, 2024, 2025, 2026 |
| Connecticut (CT) | 28 | 0.76 | 13/13 | ✅ has-data | 2022, 2023, 2024, 2025, 2026 |
| Arkansas (AR) | 23 | 0.74 | 13/13 | ✅ has-data | 2022, 2023, 2024, 2025, 2026 |
| Alabama (AL) | 20 | 0.39 | 13/13 | ✅ has-data | 2022, 2023, 2024, 2025, 2026 |
| Massachusetts (MA) | 16 | 0.22 | 13/13 | ✅ has-data | 2022, 2023, 2024, 2025, 2026 |
| Kentucky (KY) | 15 | 0.33 | 13/13 | ✅ has-data | 2023, 2024, 2025, 2026 |
| South Carolina (SC) | 11 | 0.20 | 13/13 | ✅ has-data | 2022, 2023, 2024, 2025, 2026 |
| Louisiana (LA) | 8 | 0.17 | 13/13 | ✅ has-data | 2022, 2023, 2024, 2025, 2026 |
| Oregon (OR) | 6 | 0.14 | 13/13 | ✅ has-data | 2022, 2023, 2024, 2025, 2026 |
| Rhode Island (RI) | 6 | 0.54 | 13/13 | ✅ has-data | 2022, 2023, 2024, 2025, 2026 |
| West Virginia (WV) | 5 | 0.28 | 13/13 | ✅ has-data | 2022, 2023, 2024, 2025, 2026 |
| Alaska (AK) | 4 | 0.54 | 13/13 | ✅ has-data | 2022, 2023, 2024, 2025, 2026 |
| Indiana (IN) | 4 | 0.06 | 13/13 | ✅ has-data | 2022, 2023, 2024, 2025, 2026 |
| New Jersey (NJ) | 4 | 0.04 | 13/13 | ✅ has-data | 2022, 2023, 2024, 2025, 2026 |
| Illinois (IL) | 3 | 0.02 | 13/13 | ✅ has-data | 2022, 2023, 2024, 2025, 2026 |
| Texas (TX) | 3 | 0.01 | 13/13 | ✅ has-data | 2022, 2023, 2024, 2025, 2026 |
| Arizona (AZ) | 2 | 0.03 | 13/13 | ✅ has-data | 2022, 2023, 2024, 2025, 2026 |
| Maine (ME) | 2 | 0.14 | 13/13 | ✅ has-data | 2022, 2023, 2024, 2025, 2026 |
| North Carolina (NC) | 1 | 0.01 | 13/13 | ✅ has-data | 2022, 2023, 2024, 2025, 2026 |
| Utah (UT) | 1 | 0.03 | 13/13 | ✅ has-data | 2022, 2023, 2024, 2025, 2026 |
| Delaware (DE) | 0 | 0.00 | 13/13 | ⓪ zero | 2022, 2023, 2024, 2025, 2026 |
| District of Columbia (DC) | 0 | 0.00 | 13/13 | ⓪ zero | 2022, 2023, 2024, 2025, 2026 |
| Hawaii (HI) | 0 | 0.00 | 13/13 | ⓪ zero | 2022, 2023, 2024, 2025, 2026 |
| Idaho (ID) | 0 | — | 0/13 | ⚠️ no-data | — |
| Iowa (IA) | 0 | 0.00 | 13/13 | ⓪ zero | 2022, 2023, 2024, 2025, 2026 |
| Minnesota (MN) | 0 | 0.00 | 13/13 | ⓪ zero | 2022, 2023, 2024, 2025, 2026 |
| Mississippi (MS) | 0 | — | 0/13 | ⚠️ no-data | — |
| Missouri (MO) | 0 | 0.00 | 13/13 | ⓪ zero | 2022, 2023, 2024, 2025, 2026 |
| Montana (MT) | 0 | 0.00 | 13/13 | ⓪ zero | 2022, 2023, 2024, 2025, 2026 |
| Nevada (NV) | 0 | 0.00 | 13/13 | ⓪ zero | 2026 |
| New Hampshire (NH) | 0 | 0.00 | 13/13 | ⓪ zero | 2022, 2023, 2024, 2025, 2026 |
| New Mexico (NM) | 0 | 0.00 | 13/13 | ⓪ zero | 2022, 2023, 2024, 2025, 2026 |
| North Dakota (ND) | 0 | 0.00 | 13/13 | ⓪ zero | 2022, 2023, 2024, 2025, 2026 |
| Pennsylvania (PA) | 0 | — | 0/13 | ⚠️ no-data | — |
| South Dakota (SD) | 0 | 0.00 | 13/13 | ⓪ zero | 2022, 2023, 2024, 2025, 2026 |
| Vermont (VT) | 0 | 0.00 | 13/13 | ⓪ zero | 2022, 2023, 2024, 2025, 2026 |
| Washington (WA) | 0 | 0.00 | 13/13 | ⓪ zero | 2022, 2023, 2024, 2025, 2026 |
| Wyoming (WY) | 0 | 0.00 | 13/13 | ⓪ zero | 2022, 2023, 2024, 2025, 2026 |

## Per-year totals (cumulative YTD, for the year selector)

| State | 2022 | 2023 | 2024 | 2025 | 2026 |
| --- | --- | --- | --- | --- | --- |
| Alabama (AL) | 0 | 140 | 30 | 19 | 25 |
| Alaska (AK) | 2 | 1 | 4 | 6 | 6 |
| Arizona (AZ) | 12 | 85 | 22 | 49 | 24 |
| Arkansas (AR) | 11 | 18 | 14 | 13 | 24 |
| California (CA) | 122 | 148 | 144 | 244 | 143 |
| Colorado (CO) | 87 | 263 | 146 | 205 | 189 |
| Connecticut (CT) | 18 | 2 | 66 | 41 | 44 |
| Delaware (DE) | 3 | 7 | 13 | 1 | 0 |
| District of Columbia (DC) | 1 | 3 | 5 | 5 | 0 |
| Florida (FL) | 508 | 347 | 222 | 210 | 168 |
| Georgia (GA) | 179 | 104 | 122 | 116 | 100 |
| Hawaii (HI) | 1 | 0 | 0 | 1 | 0 |
| Idaho (ID) | — | — | — | — | — |
| Illinois (IL) | 193 | 263 | 272 | 301 | 94 |
| Indiana (IN) | 15 | 35 | 25 | 27 | 34 |
| Iowa (IA) | 29 | 48 | 70 | 64 | 1 |
| Kansas (KS) | 23 | 35 | 41 | 29 | 250 |
| Kentucky (KY) | — | 51 | 21 | 45 | 169 |
| Louisiana (LA) | 65 | 69 | 29 | 99 | 62 |
| Maine (ME) | 1 | 4 | 12 | 4 | 2 |
| Maryland (MD) | 48 | 80 | 190 | 123 | 81 |
| Massachusetts (MA) | 38 | 97 | 84 | 74 | 69 |
| Michigan (MI) | 55 | 41 | 37 | 50 | 3380 |
| Minnesota (MN) | 0 | 0 | 0 | 0 | 0 |
| Mississippi (MS) | — | — | — | — | — |
| Missouri (MO) | 26 | 88 | 67 | 0 | 0 |
| Montana (MT) | 4 | 11 | 3 | 8 | 0 |
| Nebraska (NE) | 17 | 24 | 34 | 51 | 65 |
| Nevada (NV) | — | — | — | — | 5 |
| New Hampshire (NH) | 2 | 6 | 9 | 7 | 5 |
| New Jersey (NJ) | 66 | 113 | 60 | 180 | 103 |
| New Mexico (NM) | 3 | 7 | 8 | 9 | 5 |
| New York (NY) | 177 | 582 | 692 | 694 | 642 |
| North Carolina (NC) | 124 | 145 | 321 | 300 | 80 |
| North Dakota (ND) | 0 | 6 | 4 | 4 | 5 |
| Ohio (OH) | 41 | 123 | 80 | 75 | 1667 |
| Oklahoma (OK) | — | — | 20 | 41 | 116 |
| Oregon (OR) | 8 | 10 | 29 | 26 | 20 |
| Pennsylvania (PA) | — | — | — | — | — |
| Rhode Island (RI) | 2 | 6 | 12 | 6 | 9 |
| South Carolina (SC) | 61 | 38 | 49 | 45 | 20 |
| South Dakota (SD) | 2 | 5 | 3 | 3 | 0 |
| Tennessee (TN) | 29 | 72 | 87 | 38 | 66 |
| Texas (TX) | 592 | 775 | 409 | 512 | 9 |
| Utah (UT) | 19 | 60 | 49 | 37 | 23 |
| Vermont (VT) | 1 | 1 | 3 | 3 | 0 |
| Virginia (VA) | 54 | 183 | 188 | 115 | 85 |
| Washington (WA) | 1 | 0 | 1 | 0 | 0 |
| West Virginia (WV) | 4 | 5 | 9 | 8 | 22 |
| Wisconsin (WI) | 61 | 67 | 64 | 65 | 95 |
| Wyoming (WY) | 1 | 33 | 0 | 0 | 0 |

> `—` = no data for that year (not zero).

## Territories (stored, not drawn on the Albers USA map)

| Territory | 3-mo total | weeks w/ data | class |
| --- | --- | --- | --- |
| American Samoa (AS) | 0 | 0/13 | ⚠️ no-data |
| Guam (GU) | 0 | 13/13 | ⓪ zero |
| Northern Mariana Islands (MP) | 0 | 13/13 | ⓪ zero |
| Puerto Rico (PR) | 0 | 13/13 | ⓪ zero |
| U.S. Virgin Islands (VI) | 0 | 13/13 | ⓪ zero |
