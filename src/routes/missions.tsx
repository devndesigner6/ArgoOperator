import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, History, Trash2 } from "lucide-react";
import { AppShell } from "../components/app-shell";
import { getAgent } from "../lib/agents-data";
import { deleteMission, loadMissions } from "../lib/mission-store";
import { useWallet } from "../lib/wallet-context";

export const Route = createFileRoute("/missions")({
  head: () => ({
    meta: [
      { title: "Mission history — Argo" },
      {
        name: "description",
        content:
          "Every Argo mission you've launched, with the live browser evidence and Proof-of-Execution hash.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: MissionsPage,
});

function MissionsPage() {
  const wallet = useWallet();
  const qc = useQueryClient();
  const address = wallet.address ?? null;

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["missions", address],
    queryFn: () => loadMissions(address),
    staleTime: 5_000,
  });

  async function remove(id: string) {
    await deleteMission(id);
    await qc.invalidateQueries({ queryKey: ["missions", address] });
  }

  return (
    <AppShell>
      <div className="mb-10 flex items-end justify-between gap-4">
        <div>
          <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-white/40">
            {address ? `History · ${address.slice(0, 10)}…` : "History · connect wallet"}
          </span>
          <h1 className="mt-3 text-[40px] font-semibold leading-[1.02] tracking-[-0.02em] text-white md:text-[56px]">
            Your{" "}
            <span className="[font-family:var(--font-serif)] italic font-normal">
              missions
            </span>
            .
          </h1>
          <p className="mt-3 max-w-xl text-[14px] text-white/60">
            Persisted in Postgres, keyed by your wallet address. Connect the
            same wallet on any device to see the same history.
          </p>
        </div>
        <Link
          to="/mission/new"
          className="inline-flex items-center gap-1.5 rounded-md bg-[color:var(--accent)] px-4 py-2.5 text-sm font-medium text-black transition hover:brightness-110"
        >
          New mission <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {isLoading ? (
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-10 text-center text-sm text-white/50">
          Loading…
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-10 text-center">
          <History className="mx-auto h-6 w-6 text-white/40" />
          <p className="mt-3 text-sm text-white/60">
            {address
              ? "No missions yet for this wallet. Launch your first one."
              : "Connect a Cardano wallet to see missions bound to your address."}
          </p>
        </div>
      ) : (
        <div className="grid gap-px overflow-hidden rounded-xl bg-white/10">
          {items.map((m) => {
            const agent = getAgent(m.agentId);
            const when = new Date(m.createdAt).toLocaleString();
            const badge =
              m.status === "done"
                ? "bg-[color:var(--accent)]/15 text-[color:var(--accent)]"
                : m.status === "error"
                  ? "bg-red-500/15 text-red-400"
                  : "bg-white/10 text-white/60";
            return (
              <div
                key={m.id}
                className="flex flex-col gap-3 bg-[#0a0a0a] p-5 md:flex-row md:items-center md:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider ${badge}`}
                    >
                      {m.status}
                    </span>
                    <span className="font-mono text-[11px] text-white/40">{when}</span>
                  </div>
                  <h3 className="mt-1.5 text-[16px] font-semibold text-white">
                    {agent?.name ?? m.agentId}
                  </h3>
                  <p className="line-clamp-1 text-[13px] text-white/55">{m.prompt}</p>
                  {m.poeHash && (
                    <p className="mt-1 truncate font-mono text-[10px] text-white/40">
                      poe:sha256 {m.poeHash.slice(0, 24)}…
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 self-end md:self-auto">
                  <Link
                    to="/mission/$missionId"
                    params={{ missionId: m.id }}
                    className="inline-flex items-center gap-1.5 rounded-md bg-[color:var(--accent)] px-3.5 py-2 text-xs font-medium text-black transition hover:brightness-110"
                  >
                    Open <ArrowRight className="h-3 w-3" />
                  </Link>
                  <button
                    onClick={() => remove(m.id)}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-white/10 text-white/50 transition hover:bg-white/10 hover:text-white"
                    aria-label="Delete mission"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}
