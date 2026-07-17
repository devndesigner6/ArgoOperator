-- Argo mission ledger. Run once against your Neon database:
--   psql "$DATABASE_URL" -f src/lib/schema.sql

CREATE TABLE IF NOT EXISTS missions (
  id             TEXT PRIMARY KEY,
  agent_id       TEXT NOT NULL,
  wallet_address TEXT,
  prompt         TEXT NOT NULL,
  status         TEXT NOT NULL CHECK (status IN ('pending','done','error')),
  created_at     BIGINT NOT NULL,
  result         JSONB,
  error          TEXT,
  poe_hash       TEXT,
  intent         JSONB,
  payment        JSONB,
  poe_anchor     JSONB
);

CREATE INDEX IF NOT EXISTS missions_wallet_created_idx
  ON missions (wallet_address, created_at DESC);

CREATE INDEX IF NOT EXISTS missions_created_idx
  ON missions (created_at DESC);
