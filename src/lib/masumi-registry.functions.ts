// Server function that talks to a Masumi Registry Service instance.
//
// Masumi's Registry Service is self-hosted (default localhost:3000/api/v1);
// there is no single public URL. When operator sets MASUMI_REGISTRY_URL +
// MASUMI_REGISTRY_API_KEY we hit it live; otherwise we degrade cleanly to
// { source: "offline" } and the UI keeps rendering the local agent list.
//
// Docs: https://docs.masumi.network/api-reference/registry-service

import { createServerFn } from "@tanstack/react-start";

export type MasumiRegistryEntry = {
  did: string | null;
  name: string | null;
  capability: string | null;
  reputation: number | null;
  completed: number | null;
};

export type MasumiRegistryStatus =
  | { source: "live"; entries: MasumiRegistryEntry[]; fetchedAt: number }
  | { source: "offline"; reason: string; entries: MasumiRegistryEntry[]; fetchedAt: number };

type RawRegistryEntry = {
  agentIdentifier?: string;
  did?: string;
  name?: string;
  capability?: { name?: string } | string;
  reputation?: number;
  completed?: number;
  completedJobs?: number;
};

function normalise(raw: RawRegistryEntry): MasumiRegistryEntry {
  const cap = raw.capability;
  const capability =
    typeof cap === "string" ? cap : cap && typeof cap === "object" ? (cap.name ?? null) : null;
  return {
    did: raw.did ?? raw.agentIdentifier ?? null,
    name: raw.name ?? null,
    capability,
    reputation: typeof raw.reputation === "number" ? raw.reputation : null,
    completed:
      typeof raw.completed === "number"
        ? raw.completed
        : typeof raw.completedJobs === "number"
          ? raw.completedJobs
          : null,
  };
}

export const getMasumiRegistry = createServerFn({ method: "GET" }).handler(
  async (): Promise<MasumiRegistryStatus> => {
    const base = process.env.MASUMI_REGISTRY_URL;
    const apiKey = process.env.MASUMI_REGISTRY_API_KEY;
    const fetchedAt = Date.now();

    if (!base || !apiKey) {
      return {
        source: "offline",
        reason:
          "MASUMI_REGISTRY_URL / MASUMI_REGISTRY_API_KEY not set — Argo is using its local agent list.",
        entries: [],
        fetchedAt,
      };
    }

    try {
      const url = `${base.replace(/\/$/, "")}/registry-entry`;
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          token: apiKey,
        },
        body: JSON.stringify({ network: "Preprod" }),
        signal: AbortSignal.timeout(6000),
      });
      if (!res.ok) {
        return {
          source: "offline",
          reason: `Masumi registry returned ${res.status}`,
          entries: [],
          fetchedAt,
        };
      }
      const json = (await res.json()) as {
        data?: { entries?: RawRegistryEntry[] };
        entries?: RawRegistryEntry[];
      };
      const raws = json.data?.entries ?? json.entries ?? [];
      return {
        source: "live",
        entries: raws.map(normalise),
        fetchedAt,
      };
    } catch (e) {
      return {
        source: "offline",
        reason: `Registry fetch failed: ${e instanceof Error ? e.message : String(e)}`,
        entries: [],
        fetchedAt,
      };
    }
  },
);
