// Client-side Cardano tx: build → sign → submit via CIP-30 wallet.
// Sends a small self-payment on PREPROD carrying JSON metadata that binds
// the mission (id + agentId + prompt hash) to the on-chain transaction.
//
// Lucid Evolution is loaded from esm.sh at runtime, NOT bundled. Its
// transitive Cardano-CSL WASM modules use `import * as wasm from "./x.wasm"`
// which Rolldown's builtin wasm-fallback + vite-plugin-top-level-await can
// not handle together. Loading from a CDN sidesteps the whole toolchain
// mismatch and keeps the client bundle small.

import type { CIP30Api } from "./wallet-context";

const BLOCKFROST_PREPROD = "https://cardano-preprod.blockfrost.io/api/v0";
// Community-standard "message" metadata label; safe for arbitrary JSON.
export const ARGO_METADATA_LABEL = 674;
// Separate label for Proof-of-Execution anchoring — a second tx submitted
// after the agent finishes, committing the signed receipt digest on-chain.
export const ARGO_POE_METADATA_LABEL = 675;

// Pinned Lucid Evolution version. Loaded from a CDN at runtime — Cardano-CSL
// WASM does not play nicely with the local bundler. We try mirrors in order
// so a single CDN outage does not brick the pay flow.
const LUCID_VERSION = "0.5.5";
const LUCID_CDNS = [
  `https://esm.sh/@lucid-evolution/lucid@${LUCID_VERSION}?target=es2022`,
  `https://esm.sh/@lucid-evolution/lucid@${LUCID_VERSION}`,
  `https://cdn.jsdelivr.net/npm/@lucid-evolution/lucid@${LUCID_VERSION}/+esm`,
  `https://esm.run/@lucid-evolution/lucid@${LUCID_VERSION}`,
];

type LucidModule = {
  Lucid: (provider: unknown, network: "Preprod" | "Mainnet") => Promise<{
    selectWallet: { fromAPI: (api: unknown) => void };
    wallet: () => { address: () => Promise<string> };
    newTx: () => {
      pay: {
        ToAddress: (
          addr: string,
          assets: { lovelace: bigint },
        ) => LucidTxBuilder;
      };
    };
  }>;
  Blockfrost: new (url: string, projectId: string) => unknown;
};

type LucidTxBuilder = {
  pay: {
    ToAddress: (addr: string, assets: { lovelace: bigint }) => LucidTxBuilder;
  };
  attachMetadata: (label: number, meta: unknown) => LucidTxBuilder;
  complete: () => Promise<{
    sign: { withWallet: () => { complete: () => Promise<{ submit: () => Promise<string> }> } };
  }>;
};

let lucidPromise: Promise<LucidModule> | null = null;
async function loadLucid(): Promise<LucidModule> {
  if (typeof window === "undefined") {
    throw new Error("Lucid can only be loaded in the browser.");
  }
  if (!lucidPromise) {
    lucidPromise = (async () => {
      const errors: string[] = [];
      for (const url of LUCID_CDNS) {
        try {
          const mod = (await import(/* @vite-ignore */ url)) as Partial<LucidModule>;
          if (mod && typeof mod.Lucid === "function" && typeof mod.Blockfrost === "function") {
            return mod as LucidModule;
          }
          errors.push(`${url}: missing Lucid/Blockfrost exports`);
        } catch (e) {
          errors.push(`${url}: ${(e as Error).message}`);
        }
      }
      throw new Error(
        `Could not load Lucid from any CDN. Check network / ad-blockers.\n${errors.join("\n")}`,
      );
    })();
    // If every CDN fails, allow a retry on the next click.
    lucidPromise.catch(() => {
      lucidPromise = null;
    });
  }
  return lucidPromise;
}

export type VelaMetadata = {
  argo: {
    v: 1;
    missionId: string;
    agentId: string;
    promptHash: string; // sha256 hex of the prompt
    ts: number;
  };
};

async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const d = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(d))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export type PayParams = {
  api: CIP30Api;
  projectId: string;
  missionId: string;
  agentId: string;
  prompt: string;
  amountLovelace?: bigint; // default 1_500_000 (1.5 ADA to self)
};

export type PayResult = {
  txHash: string;
  metadata: VelaMetadata;
  amountLovelace: string;
};

/**
 * Build a self-payment tx on Preprod that commits the mission to chain via
 * transaction metadata, sign it with the CIP-30 wallet, and submit through
 * Blockfrost. Returns the tx hash.
 */
export async function payAndCommitMission(p: PayParams): Promise<PayResult> {
  if (!p.projectId) throw new Error("Blockfrost project id missing on the server");
  const netId = await p.api.getNetworkId();
  if (netId !== 0) {
    throw new Error(
      "Wallet is on mainnet. Switch it to Preprod (Testnet) — Argo demo settles on Preprod.",
    );
  }

  const { Lucid, Blockfrost } = await loadLucid();
  const lucid = await Lucid(
    new Blockfrost(BLOCKFROST_PREPROD, p.projectId),
    "Preprod",
  );
  lucid.selectWallet.fromAPI(p.api as unknown);

  const bech32 = await lucid.wallet().address();
  const amount = p.amountLovelace ?? 1_500_000n;
  const promptHash = await sha256Hex(p.prompt);
  const metadata: VelaMetadata = {
    argo: {
      v: 1,
      missionId: p.missionId,
      agentId: p.agentId,
      promptHash,
      ts: Date.now(),
    },
  };

  const tx = await lucid
    .newTx()
    .pay.ToAddress(bech32, { lovelace: amount })
    .attachMetadata(ARGO_METADATA_LABEL, metadata)
    .complete();
  const signed = await tx.sign.withWallet().complete();
  const txHash = await signed.submit();
  return { txHash, metadata, amountLovelace: amount.toString() };
}

/* ────────────────────────────────────────────────────────────────
   Proof-of-Execution anchor
   ────────────────────────────────────────────────────────────────

   Second on-chain tx (label 675) that commits the Ed25519 receipt
   digest to Cardano after the agent finishes. Turns "signed
   off-chain" into "anchored on Cardano".

   Cardano tx-metadata strings are capped at 64 bytes each. A digest
   (64 hex chars) and pubkey (64 hex chars) fit; the 128-char signature
   is split into a 2-element array to stay within the limit. */

export type PoeAnchorMetadata = {
  argo: {
    v: 1;
    kind: "poe";
    missionId: string;
    poe: string;   // 32-byte sha256 digest, hex
    pk: string;    // 32-byte Ed25519 public key, hex
    sig: [string, string]; // 64-byte signature, hex, split in two
    ts: number;
  };
};

export type PoeAnchorParams = {
  api: CIP30Api;
  projectId: string;
  missionId: string;
  poeDigest: string;
  poePublicKey: string;
  poeSignature: string;
  amountLovelace?: bigint; // default 1_200_000 (min UTXO)
};

export type PoeAnchorResult = {
  txHash: string;
  metadata: PoeAnchorMetadata;
  amountLovelace: string;
};

function chunk64(hex: string): [string, string] {
  const mid = Math.ceil(hex.length / 2);
  return [hex.slice(0, mid), hex.slice(mid)];
}

export async function anchorProofOfExecution(p: PoeAnchorParams): Promise<PoeAnchorResult> {
  if (!p.projectId) throw new Error("Blockfrost project id missing on the server");
  const netId = await p.api.getNetworkId();
  if (netId !== 0) {
    throw new Error(
      "Wallet is on mainnet. Switch it to Preprod (Testnet) — Argo demo settles on Preprod.",
    );
  }

  const { Lucid, Blockfrost } = await loadLucid();
  const lucid = await Lucid(
    new Blockfrost(BLOCKFROST_PREPROD, p.projectId),
    "Preprod",
  );
  lucid.selectWallet.fromAPI(p.api as unknown);

  const bech32 = await lucid.wallet().address();
  const amount = p.amountLovelace ?? 1_200_000n;
  const metadata: PoeAnchorMetadata = {
    argo: {
      v: 1,
      kind: "poe",
      missionId: p.missionId,
      poe: p.poeDigest,
      pk: p.poePublicKey,
      sig: chunk64(p.poeSignature),
      ts: Date.now(),
    },
  };

  const tx = await lucid
    .newTx()
    .pay.ToAddress(bech32, { lovelace: amount })
    .attachMetadata(ARGO_POE_METADATA_LABEL, metadata)
    .complete();
  const signed = await tx.sign.withWallet().complete();
  const txHash = await signed.submit();
  return { txHash, metadata, amountLovelace: amount.toString() };
}
