# StatReel

Next.js studio for animated rankings/comparisons, Neon Postgres, Census CBP fetch, CSV import, and browser WebM export with procedural BGM.

- Repo: https://github.com/zhanmic/statreel
- Production: https://statreel.vercel.app
- Default branch: `main` (Vercel deploys from it)

## Cursor Cloud specific instructions

This repo is public on GitHub. Cloud agents should clone `zhanmic/statreel`, work on a `cursor/...` branch, and open a PR instead of pushing straight to `main` unless asked.

```bash
npm install
npm run dev
```

App: http://localhost:3000

Required secret (add in [Cursor Cloud Agents → Secrets](https://cursor.com/dashboard/cloud-agents), do not commit):

- `DATABASE_URL` — Neon pooled Postgres URI (same value as Vercel Storage → Neon)

Optional:

- `CENSUS_API_KEY` — live U.S. Census CBP pulls

Vercel already has these for production. Local/cloud agents read `DATABASE_URL` or `POSTGRES_URL`. Tables and seed datasets are created on first API request (`GET /api/datasets`).

Do not commit `.env.local` or Neon passwords. Do not rewrite the app onto SQLite.
