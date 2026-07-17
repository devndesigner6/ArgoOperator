import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const createInput = z.object({
  useProxy: z.boolean().optional(),
  solveCaptcha: z.boolean().optional(),
});

function normalizeSteelError(e: unknown, action: string): Error {
  const msg = e instanceof Error ? e.message : String(e);
  // Strip long provider payloads; keep something actionable for the UI.
  const short = msg.length > 240 ? msg.slice(0, 237) + "…" : msg;
  return new Error(`Steel ${action} failed: ${short}`);
}

async function steelClient() {
  const apiKey = process.env.STEEL_API_KEY;
  if (!apiKey) throw new Error("STEEL_API_KEY missing on server");
  try {
    const { Steel } = await import("steel-sdk");
    return new Steel({ steelAPIKey: apiKey });
  } catch (e) {
    throw normalizeSteelError(e, "SDK load");
  }
}

export const createSteelSession = createServerFn({ method: "POST" })
  .inputValidator((d) => createInput.parse(d))
  .handler(async ({ data }) => {
    const client = await steelClient();
    try {
      const session = await client.sessions.create({
        useProxy: data.useProxy ?? false,
        solveCaptcha: data.solveCaptcha ?? false,
      });
      return {
        id: session.id,
        sessionViewerUrl: session.sessionViewerUrl,
        websocketUrl: session.websocketUrl,
        debugUrl: session.debugUrl,
        createdAt: session.createdAt,
      };
    } catch (e) {
      throw normalizeSteelError(e, "session.create");
    }
  });

const idInput = z.object({ sessionId: z.string().min(1) });

export const releaseSteelSession = createServerFn({ method: "POST" })
  .inputValidator((d) => idInput.parse(d))
  .handler(async ({ data }) => {
    const client = await steelClient();
    try {
      await client.sessions.release(data.sessionId);
      return { ok: true as const };
    } catch (e) {
      // Release failures are non-fatal for the user; return the reason so the
      // client can log without surfacing a scary error.
      return {
        ok: false as const,
        error: e instanceof Error ? e.message : String(e),
      };
    }
  });

export const getSteelSession = createServerFn({ method: "POST" })
  .inputValidator((d) => idInput.parse(d))
  .handler(async ({ data }) => {
    const client = await steelClient();
    try {
      const s = await client.sessions.retrieve(data.sessionId);
      return {
        id: s.id,
        status: s.status,
        sessionViewerUrl: s.sessionViewerUrl,
        websocketUrl: s.websocketUrl,
        createdAt: s.createdAt,
      };
    } catch (e) {
      throw normalizeSteelError(e, "session.retrieve");
    }
  });
