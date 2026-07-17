# Deploying Argo on Vercel

Argo is a single TanStack Start app — the frontend and every server function
ship in one Vercel deployment. No separate backend service.

## 1. Provision Neon Postgres

1. Create a project at <https://neon.tech>.
2. Copy the **pooled** connection string (looks like
   `postgres://user:pass@ep-xxx-pooler.region.neon.tech/dbname?sslmode=require`).
3. Run the schema once:

   ```bash
   psql "$DATABASE_URL" -f src/lib/schema.sql
   ```

## 2. Import the repo into Vercel

1. Push the repo to GitHub / GitLab / Bitbucket.
2. Vercel → **New Project** → import the repo.
3. Framework preset: **Other** (TanStack Start is auto-detected via
   `vercel.json` + nitro's `vercel` preset).
4. Root directory: repo root.

## 3. Environment variables

Add these under **Project Settings → Environment Variables** (all
environments — Production, Preview, Development):

| Variable                        | Purpose                                                                 |
| ------------------------------- | ----------------------------------------------------------------------- |
| `DATABASE_URL`                  | Neon pooled connection string                                           |
| `BLOCKFROST_PROJECT_ID_PREPROD` | Blockfrost Preprod project id (<https://blockfrost.io>)                 |
| `CEREBRAS_API_KEY`              | Cerebras inference key for the AI Analyst agent                         |
| `STEEL_API_KEY`                 | Steel browser automation key (<https://steel.dev>)                      |
| `ARGO_POE_SEED`                 | Any 32+ char random string. Argo derives its Ed25519 PoE key from this. |
| `MASUMI_REGISTRY_URL`           | Masumi Registry Service base URL (e.g. `https://your-host/api/v1`)      |
| `MASUMI_REGISTRY_API_KEY`       | Masumi Registry Service API token                                       |

None are `VITE_`-prefixed — all server-side. Nothing is exposed to the
browser bundle.

## 4. Deploy

Push to your default branch. Vercel runs `bun install && bun run build`.
`NITRO_PRESET=vercel` (set in `vercel.json`) makes nitro emit Vercel's
Build Output API format at `.vercel/output/`.

## Known limits on Vercel

- **Server function timeout**: Hobby = 10 s, Pro = 60 s. The fast agents
  (URL Scout, HN Digest, GitHub Trending, Price Sentinel) finish well under
  60 s. **DEX Scout and any future 90 s+ mission will time out on Pro.**
  Upgrade to Enterprise (900 s) or add a job queue (Inngest / Trigger.dev)
  if you need long-running missions.
- **Region**: pick a Vercel region close to your Neon region to keep DB
  round-trips fast.
- **Cardano txs**: the wallet builds and submits transactions client-side
  via Blockfrost; nothing touches the Vercel server for that path.
