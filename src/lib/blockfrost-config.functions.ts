// Expose the Blockfrost project id to the client so the browser-side Lucid
// call can talk to Blockfrost. The project id is a per-app credential, not
// a per-user secret — the same value lives in the client of any Blockfrost
// dapp — so it's safe to hand out over an authenticated server fn call.
// Kept in its own file per createServerFn splitting rules.

import { createServerFn } from "@tanstack/react-start";

export const getBlockfrostProjectId = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ projectId: string; network: "preprod" }> => {
    const projectId = process.env.BLOCKFROST_PROJECT_ID;
    if (!projectId) throw new Error("BLOCKFROST_PROJECT_ID missing on the server");
    return { projectId, network: "preprod" };
  },
);
