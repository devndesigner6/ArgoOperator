import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useState, type ReactNode, lazy, Suspense } from "react";
import { motion } from "motion/react";
import { Wallet, Github, ChevronDown, Bot, PlusCircle, Clock, ShieldCheck } from "lucide-react";

const NAV_ITEMS = [
  { label: "Agents", href: "/agents", icon: Bot },
  { label: "New mission", href: "/mission/new", icon: PlusCircle },
  { label: "History", href: "/missions", icon: Clock },
  { label: "Verify", href: "/verify", icon: ShieldCheck },
];
import { ErrorBoundary } from "./error-boundary";
import { useWallet, formatAda } from "../lib/wallet-context";
import SpecularButton from "./react-bits/SpecularButton.jsx";

function WalletButton() {
  const { address, available, connect, disconnect, connecting, error, lovelace, networkId, name } =
    useWallet();
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
              <span
                className={
                  netLabel === "preprod" ? "text-[color:var(--accent)]" : "text-orange-400"
                }
              >
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
      <SpecularButton
        size="sm"
        radius={9999}
        lineColor="#eac83c"
        baseColor="#ffffff"
        intensity={0.85}
        followMouse
        onClick={() => setOpen((v) => !v)}
        disabled={connecting}
        className="disabled:opacity-50"
      >
        <span className="flex items-center gap-1.5">
          <Wallet className="h-3.5 w-3.5" />
          {connecting ? "Connecting…" : "Connect wallet"}
        </span>
      </SpecularButton>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-lg border border-white/10 bg-[#111] p-1 shadow-xl">
          <div className="px-3 py-2 font-mono text-[10px] uppercase tracking-widest text-white/40">
            Cardano wallets
          </div>
          {available.length === 0 && (
            <div className="px-3 py-3 text-xs text-white/50">
              No CIP-30 wallet detected. Install{" "}
              <a
                href="https://eternl.io"
                target="_blank"
                rel="noreferrer"
                className="text-[color:var(--accent)] hover:underline"
              >
                Eternl
              </a>
              ,{" "}
              <a
                href="https://www.lace.io"
                target="_blank"
                rel="noreferrer"
                className="text-[color:var(--accent)] hover:underline"
              >
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
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <nav className="fixed top-6 left-1/2 z-50 -translate-x-1/2 flex items-center gap-1.5 rounded-full border border-white/10 bg-black/60 px-2 py-1.5 backdrop-blur-xl shadow-2xl">
      {/* logo */}
      <Link
        to="/"
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full hover:bg-white/5 transition pl-1"
        aria-label="Argo home"
      >
        <img src="/logo.png" alt="Argo" className="h-5 w-5" />
      </Link>

      {/* nav items list */}
      <div className="flex items-center gap-0.5">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              to={item.href}
              className={`relative flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] md:text-[12px] font-medium transition-colors duration-300 ${
                isActive ? "text-black" : "text-white/60 hover:text-white"
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="active-tab"
                  className="absolute inset-0 rounded-full bg-white"
                  transition={{ type: "spring", stiffness: 350, damping: 28 }}
                />
              )}
              <Icon className="relative z-10 h-3.5 w-3.5" />
              <span className="relative z-10 hidden sm:inline">{item.label}</span>
            </Link>
          );
        })}
      </div>

      {/* divider */}
      <div className="mx-1 h-5 w-px bg-white/15" />

      {/* actions */}
      <div className="flex items-center gap-1">
        <a
          href="https://github.com/devndesigner6/ArgoOperator"
          target="_blank"
          rel="noreferrer"
          className="flex h-7 w-7 items-center justify-center rounded-full text-white/55 transition hover:bg-white/5 hover:text-white"
          title="GitHub"
        >
          <Github className="h-4 w-4" />
        </a>
        <WalletButton />
      </div>
    </nav>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white/90 [font-family:var(--font-display)] selection:bg-[color:var(--accent)] selection:text-black">
      <AppNav />
      <main className="mx-auto max-w-7xl px-6 pt-28 pb-10">
        <ErrorBoundary boundary="app_shell_main">{children}</ErrorBoundary>
      </main>
    </div>
  );
}
