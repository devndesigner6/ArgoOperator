// Neon serverless Postgres client. HTTP-based, stateless — safe on Vercel
// serverless / edge functions with no connection pooling required.
import { neon, type NeonQueryFunction } from "@neondatabase/serverless";

let cached: NeonQueryFunction<false, false> | null = null;

export function getDb(): NeonQueryFunction<false, false> {
  if (cached) return cached;
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Provision a Neon Postgres database and add the pooled connection string to your Vercel project's environment variables.",
    );
  }
  cached = neon(url);
  return cached;
}
