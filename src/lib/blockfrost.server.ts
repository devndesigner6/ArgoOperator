// Plain server-only helper that talks to Blockfrost Preprod and confirms a
// mission tx. Both the runMission handler and the standalone verifyMissionTx
// server function call this — never go through the RPC stub server-to-server.

const BLOCKFROST_PREPROD = "https://cardano-preprod.blockfrost.io/api/v0";
const ARGO_METADATA_LABEL = "674";

export type VelaChainCommit = {
  v: number;
  missionId: string;
  agentId: string;
  promptHash: string;
  ts: number;
};

export type VerifyTxOutcome = {
  ok: boolean;
  txHash: string;
  confirmations: number | null;
  block: string | null;
  amountLovelace: string | null;
  commit: VelaChainCommit | null;
  reason?: string;
};

async function bf(path: string, projectId: string): Promise<Response> {
  return fetch(`${BLOCKFROST_PREPROD}${path}`, {
    headers: { project_id: projectId },
  });
}

export async function verifyMissionTxOnChain(args: {
  txHash: string;
  missionId: string;
  agentId: string;
}): Promise<VerifyTxOutcome> {
  const projectId = process.env.BLOCKFROST_PROJECT_ID;
  if (!projectId) throw new Error("BLOCKFROST_PROJECT_ID missing on the server");

  const deadline = Date.now() + 45_000;
  let txRes: Response | null = null;
  while (Date.now() < deadline) {
    txRes = await bf(`/txs/${args.txHash}`, projectId);
    if (txRes.status === 200) break;
    if (txRes.status !== 404) break;
    await new Promise((r) => setTimeout(r, 3000));
  }
  if (!txRes || txRes.status !== 200) {
    return {
      ok: false,
      txHash: args.txHash,
      confirmations: null,
      block: null,
      amountLovelace: null,
      commit: null,
      reason:
        txRes?.status === 404
          ? "Tx not found on Preprod after 45s — did it fail to submit?"
          : `Blockfrost /txs returned ${txRes?.status ?? "no response"}`,
    };
  }
  const tx = (await txRes.json()) as {
    block: string;
    output_amount: { unit: string; quantity: string }[];
  };
  const lovelace =
    tx.output_amount?.find((o) => o.unit === "lovelace")?.quantity ?? null;

  const metaRes = await bf(`/txs/${args.txHash}/metadata`, projectId);
  if (metaRes.status !== 200) {
    return {
      ok: false,
      txHash: args.txHash,
      confirmations: 0,
      block: tx.block,
      amountLovelace: lovelace,
      commit: null,
      reason: `Metadata unavailable (Blockfrost ${metaRes.status})`,
    };
  }
  const meta = (await metaRes.json()) as { label: string; json_metadata: unknown }[];
  const argoEntry = meta.find((m) => m.label === ARGO_METADATA_LABEL);
  const argoJson = argoEntry?.json_metadata as
    | { argo?: Partial<VelaChainCommit> }
    | undefined;
  const raw = argoJson?.argo;
  const commit: VelaChainCommit | null =
    raw && typeof raw.missionId === "string" && typeof raw.agentId === "string"
      ? {
          v: typeof raw.v === "number" ? raw.v : 1,
          missionId: raw.missionId,
          agentId: raw.agentId,
          promptHash: typeof raw.promptHash === "string" ? raw.promptHash : "",
          ts: typeof raw.ts === "number" ? raw.ts : 0,
        }
      : null;
  if (!commit || commit.missionId !== args.missionId || commit.agentId !== args.agentId) {
    return {
      ok: false,
      txHash: args.txHash,
      confirmations: 0,
      block: tx.block,
      amountLovelace: lovelace,
      commit,
      reason: "On-chain metadata does not commit to this mission (missionId / agentId mismatch).",
    };
  }
  return {
    ok: true,
    txHash: args.txHash,
    confirmations: 1,
    block: tx.block,
    amountLovelace: lovelace,
    commit,
  };
}
