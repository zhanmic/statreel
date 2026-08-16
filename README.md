# StatReel

Studio for animated number rankings and comparisons, with short WebM export and optional procedural BGM.

Recreated from the cloud agent at [cursor.com/agents/bc-01a007ef-2ef5-754d-b8f3-089a800c9935](https://cursor.com/agents/bc-01a007ef-2ef5-754d-b8f3-089a800c9935).

## Run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## What you get

- **Rank mode** — top-N bars count up from 0 (seeded: dispensaries by state)
- **Compare mode** — two vertical bars (seeded: ice cream stores vs dispensaries)
- **SQLite** — datasets persist at `data/statreel.sqlite`
- **Census CBP** — official establishment counts by state (NAICS), e.g. ice cream / snack bars `722515`
- **CSV import** — columns like `label`/`name` + `value`/`count`
- **Export** — WebM short video + optional procedural BGM

## Data sources

| Source | Notes |
| --- | --- |
| U.S. Census CBP | Trustworthy store/establishment counts. Needs a free `CENSUS_API_KEY` ([signup](https://api.census.gov/data/key_signup.html)) |
| Seeds | Dispensary ranks + ice cream vs dispensaries (attributed; cannabis has no single federal API) |
| CSV | Bring your own regulator / Pew / other numbers |

Add the optional Census key in `.env.local` when you want live pulls. Seeds and CSV work without it.

```bash
cp .env.example .env.local
```
