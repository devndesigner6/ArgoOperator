// Async, server-backed mission store. Every operation goes through
// createServerFn RPCs backed by Neon Postgres — no localStorage, no
// per-browser fallback.

import {
  deleteMissionById,
  getMissionById,
  listMissions,
  upsertMission,
} from "./missions.functions";
import type { MissionResult } from "./mission.functions";

export type MissionIntent = {
  address: string;
  message: string;
  signature: string;
  key: string;
};

export type MissionPayment = {
  txHash: string;
  amountLovelace: string;
  network: "preprod";
  submittedAt: number;
};

export type MissionPoeAnchor = {
  txHash: string;
  network: "preprod";
  anchoredAt: number;
  digest: string;
};

export type StoredMission = {
  id: string;
  agentId: string;
  prompt: string;
  createdAt: number;
  status: "pending" | "done" | "error";
  walletAddress?: string | null;
  result?: MissionResult;
  error?: string;
  poeHash?: string;
  intent?: MissionIntent;
  payment?: MissionPayment;
  poeAnchor?: MissionPoeAnchor;
};

export async function loadMissions(walletAddress?: string | null): Promise<StoredMission[]> {
  try {
    const rows = await listMissions({ data: { walletAddress: walletAddress ?? null } });
    return rows as StoredMission[];
  } catch (e) {
    console.error("Failed to load missions:", e);
    return [];
  }
}

export async function saveMission(m: StoredMission): Promise<boolean> {
  try {
    await upsertMission({ data: m });
    return true;
  } catch (e) {
    console.error("Failed to save mission:", e);
    return false;
  }
}

export async function getMission(id: string): Promise<StoredMission | null> {
  if (!id) return null;
  try {
    const row = await getMissionById({ data: { id } });
    return (row as StoredMission | null) ?? null;
  } catch (e) {
    console.error("Failed to get mission:", e);
    return null;
  }
}

export async function deleteMission(id: string): Promise<boolean> {
  if (!id) return false;
  try {
    await deleteMissionById({ data: { id } });
    return true;
  } catch (e) {
    console.error("Failed to delete mission:", e);
    return false;
  }
}

/**
 * SHA-256 hash of a JSON-serialized value using the WebCrypto API.
 * Falls back to a non-cryptographic hash if `crypto.subtle` is unavailable.
 */
export async function hashJson(value: unknown): Promise<string> {
  let serialized: string;
  try {
    serialized = JSON.stringify(value);
  } catch {
    serialized = String(value);
  }
  const bytes = new TextEncoder().encode(serialized);

  const subtle = typeof crypto !== "undefined" ? crypto.subtle : undefined;
  if (subtle && typeof subtle.digest === "function") {
    try {
      const digest = await subtle.digest("SHA-256", bytes);
      return Array.from(new Uint8Array(digest))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
    } catch (e) {
      console.error("Failed to digest hashJson:", e);
    }
  }
  let h = 0x811c9dc5;
  for (let i = 0; i < bytes.length; i++) {
    h ^= bytes[i];
    h = Math.imul(h, 0x01000193);
  }
  return `fnv1a:${(h >>> 0).toString(16).padStart(8, "0")}`;
}
