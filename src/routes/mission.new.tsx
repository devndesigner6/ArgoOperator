import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { ArrowRight, Wallet, ShieldCheck } from "lucide-react";
import { AppShell } from "../components/app-shell";
import { AGENTS, getAgent } from "../lib/agents-data";
import { saveMission } from "../lib/mission-store";
import { useWallet, formatAda } from "../lib/wallet-context";
import { payAndCommitMission } from "../lib/cardano-pay";
import { getBlockfrostProjectId } from "../lib/blockfrost-config.functions";

const searchSchema = z.object({
  agent: z.string().optional(),
});

export const Route = createFileRoute("/mission/new")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "New mission — Argo" },
      {
        name: "description",
        content:
          "Describe a web task, sign the mission intent with your Cardano wallet, and Argo dispatches a real browser agent.",
      },
    ],
  }),
  component: NewMission,
});

function NewMission() {
  const { agent: initial } = Route.useSearch();
  const navigate = useNavigate();
  const wallet = useWallet();
  const [agentId, setAgentId] = useState(initial ?? "cardano-dex-scout");
  const [prompt, setPrompt] = useState(
    "Compare ADA/DJED prices on Minswap and SundaeSwap and return the current spread.",
  );
  const [submitting, setSubmitting] = useState(false);
  const [signError, setSignError] = useState<string | null>(null);
  const [stage, setStage] = useState<"idle" | "sign" | "pay" | "launch">("idle");
  const fetchBlockfrostId = useServerFn(getBlockfrostProjectId);
  const agent = getAgent(agentId);
  // Show any agent the user can actually launch (live + beta). "coming-soon"
  // stubs stay hidden here — clicking one would submit a mission the runner
  // can't fulfil. This filter was previously `=== "live"`, which silently
  // dropped `cardano-dex-scout` from the launcher the moment we demoted it
  // to `beta`, so the launcher listed only 4 agents instead of 5.
  const live = AGENTS.filter((a) => a.status === "live" || a.status === "beta");


  const walletReady = Boolean(wallet.address);
  const walletOnPreprod = wallet.networkId === 0;
  const hasFunds = wallet.lovelace != null && agent
    ? Number(wallet.lovelace) / 1_000_000 >= agent.priceAda
    : true;

  async function submit() {
    if (!agent) return;
    setSignError(null);
    setSubmitting(true);
    const id = `msn_${Math.random().toString(36).slice(2, 10)}`;
    const createdAt = Date.now();
    try {
      let intent;
      let payment;
      if (walletReady) {
        if (!walletOnPreprod) {
          setSignError("Switch your wallet to Preprod (Testnet). Argo settles on Preprod.");
          setSubmitting(false);
          return;
        }
        setStage("sign");
        const message = [
          "ARGO mission intent",
          `id:${id}`,
          `agent:${agent.id}`,
          `price:${agent.priceAda} ADA`,
          `nonce:${createdAt}`,
          `prompt:${prompt.slice(0, 240)}`,
        ].join("\n");
        // Enable the wallet ONCE and reuse the same CIP-30 API handle for
        // both signData and the on-chain tx. Calling wallet.enable() twice
        // (once for sign, again for pay) makes Eternl/Lace shut down the
        // first channel — Lucid then dies mid-tx with
        // "Remote API with channel 'cardano-wallet-api' was shutdown".
        let freshApi;
        try {
          freshApi = await wallet.getFreshApi();
        } catch (e) {
          setSignError(e instanceof Error ? e.message : "Wallet enable failed");
          setSubmitting(false);
          setStage("idle");
          return;
        }
        try {
          const payloadHex = Array.from(new TextEncoder().encode(message))
            .map((b) => b.toString(16).padStart(2, "0"))
            .join("");
          const sig = await freshApi.signData(wallet.address!, payloadHex);
          intent = {
            address: wallet.address!,
            message,
            signature: sig.signature,
            key: sig.key,
          };
        } catch (e) {
          setSignError(e instanceof Error ? e.message : "Wallet signing was rejected");
          setSubmitting(false);
          setStage("idle");
          return;
        }

        // Real on-chain payment on Preprod, committing the mission via
        // transaction metadata. The server will refuse to run the scrape
        // until this tx is visible + metadata verifies.
        setStage("pay");
        try {
          const { projectId } = await fetchBlockfrostId();
          const pay = await payAndCommitMission({
            api: freshApi,
            projectId,
            missionId: id,
            agentId: agent.id,
            prompt,
          });
          payment = {
            txHash: pay.txHash,
            amountLovelace: pay.amountLovelace,
            network: "preprod" as const,
            submittedAt: Date.now(),
          };
        } catch (e) {
          setSignError(
            e instanceof Error
              ? `On-chain payment failed: ${e.message}`
              : "On-chain payment failed.",
          );
          setSubmitting(false);
          setStage("idle");
          return;
        }
      }
      setStage("launch");
      await saveMission({
        id,
        agentId,
        walletAddress: wallet.address ?? null,
        prompt,
        createdAt,
        status: "pending",
        intent,
        payment,
      });
      navigate({ to: "/mission/$missionId", params: { missionId: id } });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AppShell>
      <div className="mb-10">
        <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-white/40">
          Step 1 · Compose
        </span>
        <h1 className="mt-3 text-[40px] font-semibold leading-[1.02] tracking-[-0.02em] text-white md:text-[56px]">
          New{" "}
          <span className="[font-family:var(--font-serif)] italic font-normal">
            mission
          </span>
          .
        </h1>
      </div>

      <div className="grid gap-6 md:grid-cols-[1fr_360px]">
        <div className="rounded-xl border border-white/10 bg-[#111] p-6">
          <label className="font-mono text-[11px] uppercase tracking-[0.2em] text-white/40">
            Agent
          </label>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {live.map((a) => {
              const active = a.id === agentId;
              const Icon = a.icon;
              return (
                <button
                  key={a.id}
                  onClick={() => setAgentId(a.id)}
                  className={`flex items-start gap-3 rounded-lg border p-3 text-left transition ${
                    active
                      ? "border-[color:var(--accent)] bg-[color:var(--accent)]/10"
                      : "border-white/10 bg-white/5 hover:bg-white/10"
                  }`}
                >
                  <div
                    className={`inline-flex h-9 w-9 items-center justify-center rounded-md ${
                      active
                        ? "bg-[color:var(--accent)] text-black"
                        : "bg-white/10 text-white"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-white">{a.name}</div>
                    <div className="mt-0.5 font-mono text-[11px] text-white/50">
                      {a.priceAda} ₳ {a.priceUnit}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <label className="mt-6 block font-mono text-[11px] uppercase tracking-[0.2em] text-white/40">
            Mission prompt
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={6}
            className="mt-3 w-full resize-none rounded-lg border border-white/10 bg-[#0a0a0a] px-4 py-3 font-mono text-sm text-white placeholder:text-white/30 focus:border-[color:var(--accent)] focus:outline-none"
            placeholder={
              agentId === "url-scout"
                ? "Paste a URL (https://…) and any extra context. URL Scout will open it in a real browser."
                : "Describe the web task in plain English."
            }
          />
          <p className="mt-2 text-xs text-white/50">
            Be specific. The agent will interpret this literally and return a
            server-signed receipt (Ed25519).
          </p>
        </div>

        <aside className="h-fit rounded-xl border border-white/10 bg-[#111] p-6">
          <div className="font-mono text-[10px] uppercase tracking-widest text-white/40">
            Escrow quote
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-[40px] font-semibold tracking-tight text-white">
              {agent?.priceAda ?? 0}
            </span>
            <span className="text-[color:var(--accent)]">₳</span>
            <span className="text-xs text-white/50">{agent?.priceUnit ?? ""}</span>
          </div>
          <ul className="mt-4 space-y-2 text-xs text-white/60">
            <li className="flex justify-between">
              <span>Wallet</span>
              <span className="font-mono text-white">
                {walletReady ? `${wallet.address!.slice(0, 8)}…` : "not connected"}
              </span>
            </li>
            <li className="flex justify-between">
              <span>Balance</span>
              <span className="font-mono text-white">
                {walletReady ? `${formatAda(wallet.lovelace)} ₳` : "—"}
              </span>
            </li>
            <li className="flex justify-between">
              <span>Network</span>
              <span className="font-mono text-white">
                {wallet.networkId === 0 ? "Preprod" : wallet.networkId === 1 ? "Mainnet" : "—"}
              </span>
            </li>
            <li className="flex justify-between">
              <span>Intent sig</span>
              <span className="font-mono text-white">CIP-30 signData</span>
            </li>
          </ul>

          {!walletReady && (
            <p className="mt-4 rounded-md border border-yellow-500/20 bg-yellow-500/5 px-3 py-2 text-[11px] text-yellow-200/80">
              Connect a Cardano wallet in the top-right to sign the mission
              intent. You can run without a wallet, but the receipt won&rsquo;t be
              tied to your address.
            </p>
          )}
          {walletReady && !hasFunds && (
            <p className="mt-4 rounded-md border border-red-500/20 bg-red-500/5 px-3 py-2 text-[11px] text-red-300">
              Wallet balance is below the quoted price. Top up on Preprod faucet
              to run a paid mission end-to-end.
            </p>
          )}
          {signError && (
            <p className="mt-4 rounded-md border border-red-500/20 bg-red-500/10 px-3 py-2 text-[11px] text-red-300">
              {signError}
            </p>
          )}

          <button
            onClick={submit}
            disabled={submitting || !agent || prompt.trim().length < 4}
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-md bg-[color:var(--accent)] px-4 py-3 text-sm font-medium text-black transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {walletReady ? <ShieldCheck className="h-4 w-4" /> : <Wallet className="h-4 w-4" />}
            {submitting
              ? stage === "sign"
                ? "Signing intent…"
                : stage === "pay"
                  ? "Submitting Preprod tx…"
                  : "Launching…"
              : walletReady
                ? "Sign, pay & launch"
                : "Launch without wallet"}
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
          <p className="mt-3 text-[11px] text-white/50">
            {walletReady
              ? "Your wallet will pop up twice: (1) sign the intent, (2) sign a real Preprod tx (~1.5 ADA to self, with mission metadata). Server refuses to run until the tx confirms on-chain."
              : "Skip wallet signing for a quick demo run. The Ed25519 server receipt still applies, but nothing goes on-chain."}
          </p>
        </aside>
      </div>
    </AppShell>
  );
}
