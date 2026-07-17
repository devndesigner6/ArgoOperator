// Thin server-fn wrapper around verifyMissionTxOnChain so the client can
// invoke it directly (e.g. for retry buttons). All logic lives in the
// server-only helper — see blockfrost.server.ts.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { verifyMissionTxOnChain, type VerifyTxOutcome } from "./blockfrost.server";

const input = z.object({
  txHash: z.string().regex(/^[0-9a-f]{64}$/i, "txHash must be 64 hex chars"),
  missionId: z.string().min(1),
  agentId: z.string().min(1),
});

export type { VelaChainCommit, VerifyTxOutcome } from "./blockfrost.server";

export const verifyMissionTx = createServerFn({ method: "POST" })
  .inputValidator((d) => input.parse(d))
  .handler(async ({ data }): Promise<VerifyTxOutcome> => {
    return verifyMissionTxOnChain(data);
  });
