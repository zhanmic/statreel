# StatReel

Studio for animated number rankings and comparisons, with short WebM export and optional procedural BGM.

Recreated from the cloud agent at [cursor.com/agents/bc-01a007ef-2ef5-754d-b8f3-089a800c9935](https://cursor.com/agents/bc-01a007ef-2ef5-754d-b8f3-089a800c9935).

## Run

Needs a Neon Postgres `DATABASE_URL` (Vercel’s default database integration).

```bash
cp .env.example .env.local
# paste DATABASE_URL from Vercel Storage → Neon, or neon.tech
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Tables and seed datasets are created on first request.

## What you get

- **Rank mode** — top-N bars count up from 0 (seeded: dispensaries by state)
- **Compare mode** — two vertical bars (seeded: ice cream stores vs dispensaries)
- **Neon Postgres** — datasets persist via `DATABASE_URL` (Vercel Storage / Neon)
- **Census CBP** — official establishment counts by state (NAICS), e.g. ice cream / snack bars `722515`
- **CSV import** — columns like `label`/`name` + `value`/`count`
- **Export** — WebM short video + optional procedural BGM

## Data sources

| Source | Notes |
| --- | --- |
| U.S. Census CBP | Trustworthy store/establishment counts. Needs a free `CENSUS_API_KEY` ([signup](https://api.census.gov/data/key_signup.html)) |
| Seeds | Dispensary ranks + ice cream vs dispensaries (attributed; cannabis has no single federal API) |
| CSV | Bring your own regulator / Pew / other numbers |

Census key is optional. Seeds and CSV work without it.

## Deploy to Vercel

```bash
npx vercel
```

In the Vercel project:

1. **Storage → Create Database → Neon** (this sets `DATABASE_URL` / `POSTGRES_URL`)
2. Optional: add `CENSUS_API_KEY` for live Census pulls

Census and CSV imports now persist in Neon across deploys.
