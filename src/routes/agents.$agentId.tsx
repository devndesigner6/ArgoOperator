import { createFileRoute, Link, notFound, useRouter } from "@tanstack/react-router";
import { ArrowRight, CheckCircle2, Clock, Fingerprint, Wallet } from "lucide-react";
import { AppShell } from "../components/app-shell";
import { getAgent } from "../lib/agents-data";
import BlurText from "../components/react-bits/BlurText.jsx";
import ShinyText from "../components/react-bits/ShinyText.jsx";
import DecryptedText from "../components/react-bits/DecryptedText.jsx";
import TiltedCard from "../components/react-bits/TiltedCard.jsx";

export const Route = createFileRoute("/agents/$agentId")({
  loader: ({ params }) => {
    const agent = getAgent(params.agentId);
    if (!agent) throw notFound();
    // Only return serializable primitives — Lucide icons are React
    // forwardRef components and crash SSR (Seroval) if serialized.
    return { agentId: agent.id };
  },
  head: ({ loaderData, params }) => {
    const agent = loaderData ? getAgent(loaderData.agentId) : null;
    return {
      meta: agent
        ? [
            { title: `${agent.name} — Argo` },
            { name: "description", content: agent.tagline },
            { property: "og:title", content: `${agent.name} — Argo` },
            { property: "og:description", content: agent.tagline },
            { property: "og:type", content: "profile" },
            { property: "og:url", content: `/agents/${params.agentId}` },
          ]
        : [
            { title: "Agent — Argo" },
            { name: "robots", content: "noindex" },
          ],
      links: agent ? [{ rel: "canonical", href: `/agents/${params.agentId}` }] : [],
    };
  },

  errorComponent: ({ error, reset }) => {
    const router = useRouter();
    const msg = error instanceof Error ? error.message : String(error);
    return (
      <AppShell>
        <div className="mx-auto max-w-lg rounded-xl border border-white/10 bg-[#111] p-6 text-center">
          <h1 className="text-lg font-semibold text-white">Couldn&rsquo;t load this agent</h1>
          <p className="mt-2 text-sm text-white/60">
            {msg.length > 240 ? msg.slice(0, 237) + "…" : msg || "Unexpected error."}
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <button
              onClick={() => {
                router.invalidate();
                reset();
              }}
              className="inline-flex items-center gap-1.5 rounded-md bg-[color:var(--accent)] px-4 py-2 text-sm font-medium text-black"
            >
              Try again
            </button>
            <Link
              to="/agents"
              className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white"
            >
              Back to registry
            </Link>
          </div>
        </div>
      </AppShell>
    );
  },
  notFoundComponent: () => (
    <AppShell>
      <div className="py-20 text-center">
        <h1 className="text-3xl font-semibold text-white">Agent not found</h1>
        <p className="mt-2 text-sm text-white/50">
          The agent you&rsquo;re looking for isn&rsquo;t in the registry.
        </p>
        <Link
          to="/agents"
          className="mt-6 inline-flex items-center gap-1.5 rounded-md bg-[color:var(--accent)] px-4 py-2 text-sm font-medium text-black"
        >
          Back to registry
        </Link>
      </div>
    </AppShell>
  ),
  component: AgentProfile,
});


function AgentProfile() {
  const { agentId } = Route.useLoaderData();
  const agent = getAgent(agentId);
  if (!agent) throw notFound();
  const Icon = agent.icon;
  const isLive = agent.status === "live";


  return (
    <AppShell>
      <div className="mb-6">
        <Link
          to="/agents"
          className="font-mono text-[11px] uppercase tracking-[0.2em] text-white/40 transition hover:text-white"
        >
          ← Registry
        </Link>
      </div>

      <div className="grid gap-10 md:grid-cols-[1fr_340px]">
        <div>
          <div className="flex items-start gap-4">
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white">
              <Icon className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-[36px] font-semibold leading-[1.05] tracking-[-0.02em] text-white md:text-[44px]">
                <ShinyText text={agent.name} speed={3} color="#ffffff" shineColor="#ffea79" />
              </h1>
              <p className="mt-1 text-white/60">{agent.tagline}</p>
            </div>
          </div>

          <p className="mt-8 max-w-2xl text-[15px] leading-relaxed text-white/70">
            {agent.description}
          </p>

          <div className="mt-8">
            <h2 className="font-mono text-[11px] uppercase tracking-[0.2em] text-white/40">
              Skills
            </h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {agent.skills.map((s: string) => (
                <span
                  key={s}
                  className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/5 px-2.5 py-1 font-mono text-[11px] text-white/80"
                >
                  <CheckCircle2 className="h-3 w-3 text-[color:var(--accent)]" />
                  {s}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-8 grid gap-4 overflow-hidden sm:grid-cols-3">
            <Stat
              icon={<Fingerprint className="h-4 w-4" />}
              label="Masumi DID"
              value={agent.masumiDid ?? "pending registration"}
              mono
            />
            <Stat
              icon={<CheckCircle2 className="h-4 w-4" />}
              label="Reputation"
              value={agent.reputation != null ? `${agent.reputation}/5` : "—"}
            />
            <Stat
              icon={<Clock className="h-4 w-4" />}
              label="Avg. runtime"
              value={agent.avgSeconds ? `${agent.avgSeconds}s` : "—"}
            />
          </div>
        </div>

        <div className="sticky top-24 h-fit">
          <TiltedCard
            containerHeight="285px"
            containerWidth="100%"
            imageHeight="285px"
            imageWidth="100%"
            scaleOnHover={1.03}
            rotateAmplitude={5}
            showMobileWarning={false}
            showTooltip={false}
          >
            <aside className="flex h-full flex-col justify-between rounded-xl border border-white/10 bg-[#111] p-6 text-left">
              <div>
                <div className="flex items-baseline justify-between">
                  <span className="font-mono text-[10px] uppercase tracking-widest text-white/40">
                    Price
                  </span>
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider ${
                      isLive
                        ? "bg-[color:var(--accent)]/15 text-[color:var(--accent)]"
                        : "bg-white/5 text-white/40"
                    }`}
                  >
                    {isLive ? "live" : agent.status}
                  </span>
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-[40px] font-semibold tracking-tight text-white">
                    {agent.priceAda === 0 ? "—" : agent.priceAda}
                  </span>
                  <span className="text-[color:var(--accent)]">
                    {agent.priceAda === 0 ? "" : "₳"}
                  </span>
                  <span className="text-xs text-white/50">{agent.priceUnit}</span>
                </div>
                <p className="mt-3 text-xs leading-normal text-white/50">
                  Escrowed in a Masumi payment channel on Cardano Preprod. Released
                  automatically when the agent posts a valid Proof-of-Execution.
                </p>
              </div>

              {isLive ? (
                <Link
                  to="/mission/new"
                  search={{ agent: agent.id }}
                  className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-md bg-[color:var(--accent)] px-4 py-3 text-sm font-medium text-black transition hover:brightness-110"
                >
                  <Wallet className="h-4 w-4" />
                  Hire this agent
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              ) : (
                <button
                  disabled
                  className="mt-5 inline-flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-md border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-white/40"
                >
                  Coming soon
                </button>
              )}
            </aside>
          </TiltedCard>
        </div>
      </div>
    </AppShell>
  );
}

function Stat({
  icon,
  label,
  value,
  mono,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="bg-[#0d0d0d] border border-white/5 rounded-xl p-4 text-left">
      <div className="flex items-center gap-1.5 text-[color:var(--accent)]">
        {icon}
        <span className="font-mono text-[10px] uppercase tracking-widest text-white/40">
          {label}
        </span>
      </div>
      <div
        className={`mt-2 text-sm text-white ${mono ? "font-mono truncate" : "font-medium"}`}
        title={value}
      >
        <DecryptedText text={value} animateOn="view" revealDirection="center" sequential />
      </div>
    </div>
  );
}
