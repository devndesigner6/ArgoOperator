import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useState, type ReactNode, lazy, Suspense } from "react";

const GooeyNav = lazy(() => import("./GooeyNav.jsx"));

const NAV_ITEMS = [
  { label: "Agents", href: "/agents" },
  { label: "New mission", href: "/mission/new" },
  { label: "History", href: "/missions" },
  { label: "Verify", href: "/verify" },
];
import { Wallet, Github, ChevronDown } from "lucide-react";
import { ErrorBoundary } from "./error-boundary";
import { useWallet, formatAda } from "../lib/wallet-context";

function WalletButton() {
  const { address, available, connect, disconnect, connecting, error, lovelace, networkId, name } = useWallet();
  const [open, setOpen] = useState(false);

  const short = address ? `${address.slice(0, 6)}…${address.slice(-4)}` : "";
  const netLabel = networkId === 1 ? "mainnet" : networkId === 0 ? "preprod" : "";

  if (address) {
    return (
      <div className="relative">
        <button
          onClick={() => setOpen((v) => !v)}
          className="inline-flex items-center gap-2 rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-[12px] text-white/90 transition hover:bg-white/10"
          title={address}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--accent)]" />
          <span className="font-mono text-[11px]">{short}</span>
          <span className="text-[color:var(--accent)]">{formatAda(lovelace)} ₳</span>
          <ChevronDown className="h-3 w-3 text-white/50" />
        </button>
        {open && (
          <div className="absolute right-0 top-full z-50 mt-2 w-72 overflow-hidden rounded-lg border border-white/10 bg-[#111] p-3 shadow-xl">
            <div className="mb-2 flex items-center justify-between font-mono text-[10px] uppercase tracking-widest text-white/40">
              <span>{name}</span>
              <span className={netLabel === "preprod" ? "text-[color:var(--accent)]" : "text-orange-400"}>
                {netLabel || "unknown net"}
              </span>
            </div>
            <div className="rounded-md bg-black/40 p-2 font-mono text-[10px] leading-relaxed break-all text-white/60">
              {address}
            </div>
            <div className="mt-3 flex items-baseline justify-between">
              <span className="text-xs text-white/50">Balance</span>
              <span className="font-mono text-sm text-white">
                {formatAda(lovelace)} <span className="text-[color:var(--accent)]">₳</span>
              </span>
            </div>
            {networkId != null && networkId !== 0 && (
              <div className="mt-3 rounded-md bg-orange-500/10 px-2 py-1.5 text-[11px] text-orange-300">
                Argo runs on Cardano Preprod. Switch networks in your wallet.
              </div>
            )}
            <button
              onClick={() => {
                disconnect();
                setOpen(false);
              }}
              className="mt-3 w-full rounded-md border border-white/10 bg-white/5 py-1.5 text-xs text-white/80 transition hover:bg-white/10"
            >
              Disconnect
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        disabled={connecting}
        className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-[12px] font-medium text-white/90 transition hover:bg-white/10 disabled:opacity-50"
      >
        <Wallet className="h-3.5 w-3.5" />
        {connecting ? "Connecting…" : "Connect wallet"}
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-lg border border-white/10 bg-[#111] p-1 shadow-xl">
          <div className="px-3 py-2 font-mono text-[10px] uppercase tracking-widest text-white/40">
            Cardano wallets
          </div>
          {available.length === 0 && (
            <div className="px-3 py-3 text-xs text-white/50">
              No CIP-30 wallet detected. Install{" "}
              <a href="https://eternl.io" target="_blank" rel="noreferrer" className="text-[color:var(--accent)] hover:underline">
                Eternl
              </a>
              ,{" "}
              <a href="https://www.lace.io" target="_blank" rel="noreferrer" className="text-[color:var(--accent)] hover:underline">
                Lace
              </a>
              , or Nami.
            </div>
          )}
          {available.map((w) => (
            <button
              key={w}
              onClick={() => {
                void connect(w).then(() => setOpen(false));
              }}
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm capitalize text-white/90 transition hover:bg-white/10"
            >
              {w}
            </button>
          ))}
          {error && (
            <div className="mt-1 rounded-md bg-red-500/10 px-3 py-2 text-[11px] text-red-400">
              {error}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function AppNav() {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const activeIndex = NAV_ITEMS.findIndex(
    (i) => pathname === i.href || pathname.startsWith(i.href + "/"),
  );

  return (
    <header className="sticky top-0 z-40 border-b border-white/5 bg-[#0a0a0a]/85 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 md:px-6">
        <Link to="/" className="flex shrink-0 items-center" aria-label="Argo home">
          <img src="/logo.png" alt="Argo" className="h-8 w-8" />
        </Link>
        <div className="hidden min-w-0 flex-1 justify-center md:flex">

          <Suspense
            fallback={
              <nav className="flex items-center gap-6 text-[13px] text-white/60">
                {NAV_ITEMS.map((i) => (
                  <span key={i.href}>{i.label}</span>
                ))}
              </nav>
            }
          >
            <GooeyNav
              items={NAV_ITEMS}
              initialActiveIndex={activeIndex}
              particleCount={15}
              particleDistances={[80, 10]}
              particleR={100}
              animationTime={600}
              timeVariance={300}
              colors={[1, 2, 3, 1, 2, 3, 1, 4]}
              onItemSelect={(item) => navigate({ to: item.href })}
            />
          </Suspense>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="https://github.com/masumi-network"
            target="_blank"
            rel="noreferrer"
            className="hidden items-center gap-1.5 rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-[12px] text-white/80 transition hover:bg-white/10 sm:inline-flex"
          >
            <Github className="h-3.5 w-3.5" />
            GitHub
          </a>
          <WalletButton />
        </div>
      </div>
    </header>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white/90 [font-family:var(--font-display)] selection:bg-[color:var(--accent)] selection:text-black">
      <AppNav />
      <main className="mx-auto max-w-7xl px-6 py-10">
        <ErrorBoundary boundary="app_shell_main">{children}</ErrorBoundary>
      </main>
    </div>
  );
}
