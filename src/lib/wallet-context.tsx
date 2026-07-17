import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type CIP30Api = {
  getUsedAddresses: () => Promise<string[]>;
  getUnusedAddresses: () => Promise<string[]>;
  getChangeAddress: () => Promise<string>;
  getNetworkId: () => Promise<number>;
  getBalance: () => Promise<string>; // hex CBOR
  signData: (
    addr: string,
    payloadHex: string,
  ) => Promise<{ signature: string; key: string }>;
};

export type CIP30Wallet = {
  enable: () => Promise<CIP30Api>;
  name: string;
  icon: string;
  apiVersion?: string;
};

function getCardano(): Record<string, CIP30Wallet> | undefined {
  if (typeof window === "undefined") return undefined;
  return (window as unknown as { cardano?: Record<string, CIP30Wallet> }).cardano;
}

type WalletState = {
  name: string | null;
  address: string | null;
  networkId: number | null;
  lovelace: bigint | null;
  api: CIP30Api | null;
  available: string[];
  connect: (name: string) => Promise<void>;
  disconnect: () => void;
  /** Re-enable the current wallet and return a fresh CIP-30 API handle.
   *  Wallets shut down idle API objects (Lace/Eternl throw
   *  "Remote API ... was shutdown"), so call this right before signing. */
  getFreshApi: () => Promise<CIP30Api>;
  signMessage: (payload: string) => Promise<{ signature: string; key: string; addressHex: string }>;
  connecting: boolean;
  error: string | null;
};

const Ctx = createContext<WalletState | null>(null);

// Minimal CBOR decoder: extracts the top-level unsigned integer of a
// getBalance() response. Real Cardano balances can be either a bare uint
// (major type 0) or an array [coin, multiasset]. We only need the coin.
function decodeLovelace(hex: string): bigint | null {
  try {
    const bytes = hexToBytes(hex);
    return decodeUint(bytes, 0)?.value ?? null;
  } catch (e) {
    reportLovableError(e, { boundary: "wallet.decodeLovelace" });
    return null;
  }
}

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.startsWith("0x") ? hex.slice(2) : hex;
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  return out;
}

function decodeUint(bytes: Uint8Array, offset: number): { value: bigint; next: number } | null {
  const first = bytes[offset];
  const major = first >> 5;
  const info = first & 0x1f;
  // If it's an array, recurse into first element (the coin).
  if (major === 4) return decodeUint(bytes, offset + 1);
  if (major !== 0) return null;
  if (info < 24) return { value: BigInt(info), next: offset + 1 };
  if (info === 24) return { value: BigInt(bytes[offset + 1]), next: offset + 2 };
  if (info === 25) {
    const v = (bytes[offset + 1] << 8) | bytes[offset + 2];
    return { value: BigInt(v), next: offset + 3 };
  }
  if (info === 26) {
    const v =
      (BigInt(bytes[offset + 1]) << 24n) |
      (BigInt(bytes[offset + 2]) << 16n) |
      (BigInt(bytes[offset + 3]) << 8n) |
      BigInt(bytes[offset + 4]);
    return { value: v, next: offset + 5 };
  }
  if (info === 27) {
    let v = 0n;
    for (let i = 0; i < 8; i++) v = (v << 8n) | BigInt(bytes[offset + 1 + i]);
    return { value: v, next: offset + 9 };
  }
  return null;
}

function strToHex(s: string): string {
  return Array.from(new TextEncoder().encode(s))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

const LS_NAME = "argo.wallet.name";

export function WalletProvider({ children }: { children: ReactNode }) {
  const [name, setName] = useState<string | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [networkId, setNetworkId] = useState<number | null>(null);
  const [lovelace, setLovelace] = useState<bigint | null>(null);
  const [api, setApi] = useState<CIP30Api | null>(null);
  const [available, setAvailable] = useState<string[]>([]);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const found = Object.keys(getCardano() ?? {}).filter(
      (k) => typeof getCardano()?.[k]?.enable === "function",
    );
    setAvailable(found);
  }, []);

  const hydrate = useCallback(async (walletName: string, walletApi: CIP30Api) => {
    const [used, unused, net, balHex] = await Promise.all([
      walletApi.getUsedAddresses(),
      walletApi.getUnusedAddresses(),
      walletApi.getNetworkId(),
      walletApi.getBalance(),
    ]);
    const addr = used[0] ?? unused[0] ?? (await walletApi.getChangeAddress());
    if (!addr) throw new Error("Wallet exposed no address");
    setName(walletName);
    setAddress(addr);
    setNetworkId(net);
    setLovelace(decodeLovelace(balHex));
    setApi(walletApi);
    window.localStorage.setItem(LS_NAME, walletName);
  }, []);

  const connect = useCallback(
    async (walletName: string) => {
      setError(null);
      setConnecting(true);
      try {
        const w = getCardano()?.[walletName];
        if (!w) throw new Error(`${walletName} not found in getCardano()`);
        const walletApi = await w.enable();
        await hydrate(walletName, walletApi);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        setError(msg);
        console.error("Wallet connect failed:", e);
      } finally {
        setConnecting(false);
      }
    },
    [hydrate],
  );

  const disconnect = useCallback(() => {
    setName(null);
    setAddress(null);
    setNetworkId(null);
    setLovelace(null);
    setApi(null);
    setError(null);
    if (typeof window !== "undefined") window.localStorage.removeItem(LS_NAME);
  }, []);

  // Try silent reconnect on load.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = window.localStorage.getItem(LS_NAME);
    if (!saved) return;
    // Give injected wallets a beat to mount.
    const t = setTimeout(() => {
      if (getCardano()?.[saved]?.enable) void connect(saved);
    }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getFreshApi = useCallback(async (): Promise<CIP30Api> => {
    if (!name) throw new Error("Connect a wallet first");
    const w = getCardano()?.[name];
    if (!w) throw new Error(`${name} not found in getCardano()`);
    const fresh = await w.enable();
    setApi(fresh);
    return fresh;
  }, [name]);

  const signMessage = useCallback(
    async (payload: string) => {
      if (!address) throw new Error("Connect a wallet first");
      const live = await getFreshApi();
      const payloadHex = strToHex(payload);
      const sig = await live.signData(address, payloadHex);
      return { signature: sig.signature, key: sig.key, addressHex: address };
    },
    [address, getFreshApi],
  );

  const value = useMemo<WalletState>(
    () => ({
      name,
      address,
      networkId,
      lovelace,
      api,
      available,
      connect,
      disconnect,
      getFreshApi,
      signMessage,
      connecting,
      error,
    }),
    [name, address, networkId, lovelace, api, available, connect, disconnect, getFreshApi, signMessage, connecting, error],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useWallet(): WalletState {
  const v = useContext(Ctx);
  if (!v) throw new Error("useWallet must be used inside <WalletProvider>");
  return v;
}

export function formatAda(lovelace: bigint | null): string {
  if (lovelace == null) return "—";
  const ada = Number(lovelace) / 1_000_000;
  if (ada >= 1000) return ada.toFixed(0);
  if (ada >= 1) return ada.toFixed(2);
  return ada.toFixed(4);
}
