// Server functions for the mission ledger (Neon Postgres).
// Called from client code via the async wrappers in mission-store.ts.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getDb } from "./db.server";

const StoredMissionSchema = z.object({
  id: z.string().min(1).max(64),
  agentId: z.string().min(1).max(64),
  walletAddress: z.string().max(200).nullable().optional(),
  prompt: z.string().min(1).max(4000),
  createdAt: z.number().int(),
  status: z.enum(["pending", "done", "error"]),
  result: z.any().optional(),
  error: z.string().max(2000).optional(),
  poeHash: z.string().max(200).optional(),
  intent: z.any().optional(),
  payment: z.any().optional(),
  poeAnchor: z.any().optional(),
});

export type StoredMissionDto = z.infer<typeof StoredMissionSchema>;

type Row = Record<string, unknown>;

function rowToMission(r: Row): StoredMissionDto {
  return {
    id: r.id as string,
    agentId: r.agent_id as string,
    walletAddress: (r.wallet_address as string | null) ?? null,
    prompt: r.prompt as string,
    createdAt: Number(r.created_at),
    status: r.status as "pending" | "done" | "error",
    result: (r.result as unknown) ?? undefined,
    error: (r.error as string | null) ?? undefined,
    poeHash: (r.poe_hash as string | null) ?? undefined,
    intent: (r.intent as unknown) ?? undefined,
    payment: (r.payment as unknown) ?? undefined,
    poeAnchor: (r.poe_anchor as unknown) ?? undefined,
  };
}

function j(v: unknown): string | null {
  return v === undefined || v === null ? null : JSON.stringify(v);
}

export const upsertMission = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => StoredMissionSchema.parse(d))
  .handler(async ({ data }) => {
    const sql = getDb();
    await sql`
      INSERT INTO missions
        (id, agent_id, wallet_address, prompt, status, created_at,
         result, error, poe_hash, intent, payment, poe_anchor)
      VALUES
        (${data.id}, ${data.agentId}, ${data.walletAddress ?? null},
         ${data.prompt}, ${data.status}, ${data.createdAt},
         ${j(data.result)}::jsonb, ${data.error ?? null}, ${data.poeHash ?? null},
         ${j(data.intent)}::jsonb, ${j(data.payment)}::jsonb, ${j(data.poeAnchor)}::jsonb)
      ON CONFLICT (id) DO UPDATE SET
        status     = EXCLUDED.status,
        result     = COALESCE(EXCLUDED.result, missions.result),
        error      = COALESCE(EXCLUDED.error, missions.error),
        poe_hash   = COALESCE(EXCLUDED.poe_hash, missions.poe_hash),
        intent     = COALESCE(EXCLUDED.intent, missions.intent),
        payment    = COALESCE(EXCLUDED.payment, missions.payment),
        poe_anchor = COALESCE(EXCLUDED.poe_anchor, missions.poe_anchor)
    `;
    return { ok: true };
  });

export const getMissionById = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ id: z.string().min(1).max(64) }).parse(d))
  .handler(async ({ data }): Promise<StoredMissionDto | null> => {
    const sql = getDb();
    const rows = (await sql`SELECT * FROM missions WHERE id = ${data.id} LIMIT 1`) as Row[];
    return rows[0] ? rowToMission(rows[0]) : null;
  });

export const listMissions = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({ walletAddress: z.string().max(200).nullable().optional() }).parse(d),
  )
  .handler(async ({ data }): Promise<StoredMissionDto[]> => {
    const sql = getDb();
    const rows = data.walletAddress
      ? ((await sql`
          SELECT * FROM missions
          WHERE wallet_address = ${data.walletAddress}
          ORDER BY created_at DESC
          LIMIT 50
        `) as Row[])
      : ((await sql`
          SELECT * FROM missions
          WHERE wallet_address IS NULL
          ORDER BY created_at DESC
          LIMIT 50
        `) as Row[]);
    return rows.map(rowToMission);
  });

export const deleteMissionById = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ id: z.string().min(1).max(64) }).parse(d))
  .handler(async ({ data }) => {
    const sql = getDb();
    await sql`DELETE FROM missions WHERE id = ${data.id}`;
    return { ok: true };
  });
