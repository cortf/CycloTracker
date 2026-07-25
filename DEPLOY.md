# Deploying CycloTracker (Vercel)

CycloTracker builds to a **fully static site** — the homepage, `/methodology`, and
all three `/api/*` endpoints are prerendered at build time and served from
Vercel's global CDN. There are **no serverless functions and no runtime
database**, so traffic — viral or not — is served from cache. Cost scales with
build frequency (once a week), not with visitors.

Fresh data ships via a **weekly rebuild**: the build itself re-ingests from the
public sources (`vercel-build` script), so the SQLite DB is a throwaway build
artifact and is never committed.

---

## 1. Push the code to GitHub (prerequisite)

Vercel deploys by importing a GitHub repo. This local clone currently has **no
git remote configured** (`git remote -v` is empty), so confirm the code is on
GitHub first. If it isn't:

```bash
# create the repo and push (GitHub CLI)
gh repo create cyclotracker --private --source=. --remote=origin --push

# …or point at an existing repo you created in the GitHub UI
git remote add origin git@github.com:<you>/cyclotracker.git
git push -u origin main
```

## 2. Import into Vercel

1. Sign up / log in at <https://vercel.com> (Hobby plan is free).
2. **Add New → Project → Import** your GitHub repo.
3. Framework preset auto-detects **Next.js**. Leave defaults.
4. **Build command:** Vercel runs the `vercel-build` script automatically
   (`migrate → seed → ingest → next build`). If a deploy skips ingestion, set
   **Settings → Build & Development → Build Command** explicitly to
   `npm run vercel-build`.

## 3. Environment variable

**Settings → Environment Variables** → add:

| Name | Value | Environments |
| --- | --- | --- |
| `CENSUS_API_KEY` | your key ([free signup](https://api.census.gov/data/key_signup.html)) | Production, Preview |

The build ingests Census population data, so the build fails without it. (A
failed build never replaces a working deployment — the last good site stays up.)

## 4. Turn on page-view tracking

`<Analytics />` is already in [app/layout.tsx](app/layout.tsx). In Vercel:
**Project → Analytics → Enable**. Web Analytics is free (privacy-friendly, no
cookie banner) and starts counting on the next deploy.

## 5. Connect cyclotracker.com

1. Vercel: **Settings → Domains → Add** `cyclotracker.com` (add `www` too).
   Vercel shows the exact DNS records to create — **those values are the source
   of truth**; the ones below are the current defaults.
2. Squarespace: **Domains → cyclotracker.com → DNS Settings**. Remove any parking
   / default `A` or `CNAME` records for `@` and `www`, then add:

   | Type | Host | Value |
   | --- | --- | --- |
   | `A` | `@` | `76.76.21.21` |
   | `CNAME` | `www` | `cname.vercel-dns.com` |

3. Back in Vercel, wait for the domain to verify (usually minutes). Vercel issues
   the HTTPS certificate automatically.

## 6. Automatic weekly refresh

The site's data is frozen per deploy, so "refresh weekly" = "rebuild weekly."
[.github/workflows/refresh.yml](.github/workflows/refresh.yml) already runs every
Monday; it now also pokes Vercel to rebuild (which re-ingests fresh data). Wire
it up:

1. Vercel: **Settings → Git → Deploy Hooks** → create a hook (e.g. name
   `weekly`, branch `main`). Copy the URL.
2. GitHub repo: **Settings → Secrets and variables → Actions → New secret**:
   - `VERCEL_DEPLOY_HOOK_URL` → the hook URL from step 1.
   - `CENSUS_API_KEY` → your Census key (the Action ingests too).

You can also trigger a rebuild any time from GitHub **Actions → Weekly refresh →
Run workflow**, or in Vercel with **Redeploy**.

---

## Scaling & cost, in one line

Static files on a CDN: a viral spike hits Vercel's edge, not your origin. Expect
to stay on the **free Hobby tier**. If you later want commercial terms or higher
limits, Pro is a flat ~$20/mo — there is no per-visitor bill to run away with.

## Tradeoff to know about

To stay fully static, `GET /api/cases` serves the **default** snapshot (count,
last 3 months) and ignores `?year=`/`?metric=` query params — the app itself
doesn't need them (every view is embedded in the page). `/api/sources` and
`/api/states/[fips]` are fully functional as static JSON. If you ever need the
live, query-filterable `/api/cases` back, make that one route dynamic
(remove `export const dynamic = "force-static"`, restore the query parsing) and
add `outputFileTracingIncludes` in `next.config.ts` so the function bundles the
DB — it becomes one cached serverless function instead of a static file.
