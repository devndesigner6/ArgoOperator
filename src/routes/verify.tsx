import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import * as ed from "@noble/ed25519";
import { sha256 } from "@noble/hashes/sha2.js";
import { sha512 } from "@noble/hashes/sha2.js";
import { ShieldCheck, ShieldX, Upload } from "lucide-react";
import { AppShell } from "../components/app-shell";
import BlurText from "../components/react-bits/BlurText.jsx";
import ShinyText from "../components/react-bits/ShinyText.jsx";
import DecryptedText from "../components/react-bits/DecryptedText.jsx";
import BorderGlow from "../components/react-bits/BorderGlow.jsx";

ed.hashes.sha512 = ((m: Uint8Array) => sha512(m)) as typeof ed.hashes.sha512;

export const Route = createFileRoute("/verify")({
  head: () => ({
    meta: [
      { title: "Verify Proof-of-Execution — Argo" },
      {
        name: "description",
        content:
          "Paste a Argo mission receipt and verify its Ed25519 signature entirely in your browser. No server round-trip.",
      },
      { property: "og:title", content: "Verify Proof-of-Execution — Argo" },
      {
        property: "og:description",
        content:
          "Verify Argo mission receipts in your browser — Ed25519, no server round-trip.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/verify" },
    ],
    links: [{ rel: "canonical", href: "/verify" }],
  }),
  component: VerifyPage,
});

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.replace(/^0x/, "");
  if (clean.length % 2 !== 0) throw new Error("hex length must be even");
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) {
    const byte = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
    if (Number.isNaN(byte)) throw new Error(`invalid hex at ${i * 2}`);
    out[i] = byte;
  }
  return out;
}

type Result =
  | { kind: "idle" }
  | { kind: "ok"; publicKey: string; digest: string; agentId: string; missionId: string }
  | { kind: "bad"; reason: string };

function verify(json: string): Result {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return { kind: "bad", reason: "Input is not valid JSON." };
  }
  const p = parsed as Record<string, unknown>;
  const sig = p.signature as Record<string, unknown> | undefined;
  const canonical = p.canonical as string | undefined;
  if (!sig || !canonical) {
    return { kind: "bad", reason: "Missing `signature` or `canonical` field." };
  }
  const { algo, publicKey, signature, digest } = sig as {
    algo: string;
    publicKey: string;
    signature: string;
    digest: string;
  };
  if (algo !== "ed25519") return { kind: "bad", reason: `Unsupported algo: ${algo}` };

  const canonicalBytes = new TextEncoder().encode(canonical);
  const recomputed = sha256(canonicalBytes);
  const recomputedHex = Array.from(recomputed)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  if (recomputedHex !== digest) {
    return { kind: "bad", reason: "Digest does not match canonical payload — payload was tampered with." };
  }

  try {
    const ok = ed.verify(hexToBytes(signature), recomputed, hexToBytes(publicKey));
    if (!ok) return { kind: "bad", reason: "Signature invalid for this public key." };
  } catch (e) {
    return { kind: "bad", reason: e instanceof Error ? e.message : "Signature verification threw." };
  }

  const body = JSON.parse(canonical) as { agentId?: string };
  return {
    kind: "ok",
    publicKey,
    digest,
    agentId: body.agentId ?? "unknown",
    missionId: (p.missionId as string | undefined) ?? "—",
  };
}

function VerifyPage() {
  const [text, setText] = useState("");
  const result = useMemo<Result>(() => (text.trim() ? verify(text) : { kind: "idle" }), [text]);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setText(await f.text());
  }

  return (
    <AppShell>
      <div className="mb-8 max-w-2xl">
        <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-white/40">
          Proof-of-Execution · Ed25519
        </span>
        <h1 className="mt-3 text-[40px] font-semibold leading-[1.02] tracking-[-0.02em] md:text-[56px] flex flex-wrap items-center gap-x-3">
          <BlurText text="Verify a" delay={100} animateBy="words" />
          <span className="[font-family:var(--font-serif)] italic font-normal">
            <DecryptedText text="receipt" animateOn="view" revealDirection="center" sequential />
          </span>
          <BlurText text="." delay={200} animateBy="words" />
        </h1>
        <p className="mt-4 text-[15px] leading-relaxed text-white/60">
          Paste a Argo PoE artifact below (or upload the JSON). Verification runs
          entirely in your browser — no data leaves this page.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="rounded-xl border border-white/10 bg-[#111] p-5">
          <div className="mb-3 flex items-center justify-between">
            <label className="font-mono text-[11px] uppercase tracking-[0.2em] text-white/40">
              Receipt JSON
            </label>
            <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-[12px] text-white/80 transition hover:bg-white/10">
              <Upload className="h-3.5 w-3.5" />
              Upload
              <input type="file" accept="application/json,.json" className="hidden" onChange={onFile} />
            </label>
          </div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={22}
            className="w-full resize-none rounded-lg border border-white/10 bg-black/40 px-4 py-3 font-mono text-[11px] leading-relaxed text-white/80 focus:border-[color:var(--accent)] focus:outline-none"
            placeholder='{ "signature": { "algo": "ed25519", ... }, "canonical": "...", ... }'
            spellCheck={false}
          />
        </div>

        <div className="h-fit">
          <BorderGlow
            glowColor="260 85 65"
            backgroundColor="#111111"
            borderRadius={12}
            glowRadius={40}
            edgeSensitivity={25}
            colors={["#7C3AED", "#f472b6", "#06B6D4"]}
          >
            <aside className="flex h-full flex-col justify-between rounded-xl p-5 text-left">
              <div>
                <div className="font-mono text-[10px] uppercase tracking-widest text-white/40">
                  Verification
                </div>
                {result.kind === "idle" && (
                  <div className="mt-4 text-sm text-white/50">
                    Paste a receipt to check its signature.
                  </div>
                )}
                {result.kind === "ok" && (
                  <div className="mt-4 animate-fade-in">
                    <div className="inline-flex items-center gap-2 rounded-full bg-[color:var(--accent)]/15 px-3 py-1 text-[color:var(--accent)]">
                      <ShieldCheck className="h-4 w-4" />
                      <span className="text-sm font-medium">Signature valid</span>
                    </div>
                    <dl className="mt-4 space-y-2 text-xs text-white/60">
                      <Row k="mission" v={result.missionId} />
                      <Row k="agent" v={result.agentId} />
                      <Row k="publicKey" v={result.publicKey} truncate />
                      <Row k="digest" v={result.digest} truncate />
                    </dl>
                    <p className="mt-4 text-[11px] text-white/55 leading-normal">
                      Canonical payload matches digest, and signature checks out against the agent DID.
                    </p>
                  </div>
                )}
                {result.kind === "bad" && (
                  <div className="mt-4 animate-fade-in">
                    <div className="inline-flex items-center gap-2 rounded-full bg-red-500/15 px-3 py-1 text-red-400">
                      <ShieldX className="h-4 w-4" />
                      <span className="text-sm font-medium">Invalid</span>
                    </div>
                    <p className="mt-3 text-xs leading-normal text-red-300/90">{result.reason}</p>
                  </div>
                )}
              </div>
              <div className="border-t border-white/10 pt-3 text-[11px] text-white/50">
                Need a receipt? Run from{" "}
                <Link to="/mission/new" className="text-[color:var(--accent)] hover:underline">
                  /mission/new
                </Link>
              </div>
            </aside>
          </BorderGlow>
        </div>
      </div>
    </AppShell>
  );
}

function Row({ k, v, truncate }: { k: string; v: string; truncate?: boolean }) {
  const displayVal = truncate && v.length > 20 ? `${v.slice(0, 10)}…${v.slice(-8)}` : v;
  return (
    <div className="flex justify-between gap-3 text-left">
      <dt className="font-mono text-white/40">{k}</dt>
      <dd className={`font-mono text-white/80 ${truncate ? "truncate" : ""}`} title={v}>
        <DecryptedText key={v} text={displayVal} animateOn="view" revealDirection="center" sequential />
      </dd>
    </div>
  );
}
