import * as ed from "@noble/ed25519";
import { sha256 } from "@noble/hashes/sha2.js";
import { sha512 } from "@noble/hashes/sha2.js";

// @noble/ed25519 v3 needs sha512 wired in for sync APIs.
ed.hashes.sha512 = ((m: Uint8Array) => sha512(m)) as typeof ed.hashes.sha512;

function seedBytes(): Uint8Array {
  const seed = process.env.ARGO_POE_SEED;
  if (!seed || seed.length < 16) {
    throw new Error(
      "ARGO_POE_SEED missing or too short on server (require 16+ chars). Set it in Vercel env vars.",
    );
  }
  // Derive 32-byte Ed25519 secret from the stored seed string.
  return sha256(new TextEncoder().encode(seed));
}

export function poeKeys(): { secretKey: Uint8Array; publicKey: Uint8Array } {
  const secretKey = seedBytes();
  const publicKey = ed.getPublicKey(secretKey);
  return { secretKey, publicKey };
}

export function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Canonical JSON stringify with sorted keys — deterministic hashing across producers/verifiers. */
export function canonicalize(value: unknown): string {
  return JSON.stringify(sortKeys(value));
}

function sortKeys(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(sortKeys);
  if (v && typeof v === "object") {
    const o = v as Record<string, unknown>;
    return Object.keys(o)
      .sort()
      .reduce<Record<string, unknown>>((acc, k) => {
        acc[k] = sortKeys(o[k]);
        return acc;
      }, {});
  }
  return v;
}

export function signPayload(payload: unknown): {
  algo: "ed25519";
  publicKey: string;
  digest: string;
  signature: string;
  canonical: string;
} {
  const { secretKey, publicKey } = poeKeys();
  const canonical = canonicalize(payload);
  const bytes = new TextEncoder().encode(canonical);
  const digest = sha256(bytes);
  const signature = ed.sign(digest, secretKey);
  return {
    algo: "ed25519",
    publicKey: toHex(publicKey),
    digest: toHex(digest),
    signature: toHex(signature),
    canonical,
  };
}
