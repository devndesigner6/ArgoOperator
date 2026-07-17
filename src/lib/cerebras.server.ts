// Cerebras Cloud client — OpenAI-compatible, fast hosted inference.
// Free tier: https://cloud.cerebras.ai → API Keys.
// Server-only: reads CEREBRAS_API_KEY from env inside each call.

const CEREBRAS_URL = "https://api.cerebras.ai/v1/chat/completions";
// Public Cerebras models (verified via /v1/models). `gemma-4-31b` returns a
// standard `content` field; `gpt-oss-120b` and `zai-glm-4.7` are reasoning
// models that put their output under `reasoning` and often exhaust the token
// budget before emitting `content`. Gemma is the reliable default; the others
// are kept as fallbacks with a reasoning-field reader below.
const AVAILABLE_MODELS = ["gemma-4-31b", "gpt-oss-120b", "zai-glm-4.7"] as const;
const DEFAULT_MODEL_ID = "gemma-4-31b";
const FALLBACK_MODEL_IDS = [...AVAILABLE_MODELS];

type Msg = { role: "system" | "user" | "assistant"; content: string };
type ChatResult = { content: string; model: string };

function getConfiguredModelIds() {
  const configured = process.env.CEREBRAS_MODEL?.trim();
  // Only honour the env override if it's one we know is currently public,
  // otherwise a stale env value (e.g. "llama-3.3-70b") permanently 404s.
  const primary =
    configured && (AVAILABLE_MODELS as readonly string[]).includes(configured)
      ? configured
      : DEFAULT_MODEL_ID;
  return Array.from(new Set([primary, ...FALLBACK_MODEL_IDS]));
}

function isMissingModel(status: number, body: string) {
  return status === 404 && /model(_| )?not(_| )?found|does not exist|do not have access/i.test(body);
}

async function chat(messages: Msg[], opts?: { maxTokens?: number; temperature?: number }): Promise<ChatResult> {
  const key = process.env.CEREBRAS_API_KEY;
  if (!key) throw new Error("CEREBRAS_API_KEY missing on the server");

  let lastError = "";
  for (const model of getConfiguredModelIds()) {
    const res = await fetch(CEREBRAS_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model,
        messages,
        // Reasoning models consume most of the budget on hidden reasoning
        // tokens, so give them plenty of headroom.
        max_completion_tokens: opts?.maxTokens ?? 1500,
        temperature: opts?.temperature ?? 0.2,
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      lastError = `Cerebras ${res.status}: ${text.slice(0, 240)}`;
      if (isMissingModel(res.status, text)) continue;
      throw new Error(lastError);
    }

    const data = (await res.json()) as {
      choices?: { message?: { content?: string; reasoning?: string } }[];
    };
    const msg = data.choices?.[0]?.message;
    // Reasoning models sometimes only fill `reasoning` — use it as fallback.
    const content = msg?.content?.trim() || msg?.reasoning?.trim();
    if (!content) {
      lastError = "Cerebras returned no content";
      continue;
    }
    return { content, model };
  }

  throw new Error(lastError || "Cerebras has no accessible configured model");
}


// Ponytail persona (github.com/DietrichGebert/ponytail, MIT) — compressed for
// token efficiency. Turns the analyst into a lazy senior dev: shortest useful
// answer, no preamble, no filler, cite what you use, admit gaps plainly.
const PONYTAIL = [
  "PONYTAIL MODE (senior dev):",
  "- Shortest answer that actually works. Delete before you add.",
  "- No preamble, no restating the task, no meta ('here is', 'as an AI').",
  "- If the sources don't answer it, say so in one line. Don't pad.",
  "- Prefer one line over five. If a bullet doesn't earn its place, cut it.",
  "- Explanation longer than the finding = smuggled complexity. Delete it.",
].join("\n");

export type AnalystPlan = {
  urls: string[];
  focus: string;
  model: string;
};


function extractUrls(text: string): string[] {
  const matches = text.match(/https?:\/\/[^\s)"']+/g) ?? [];
  return Array.from(new Set(matches)).slice(0, 3);
}

/**
 * Ask Llama to plan the mission: what URLs to scout, and what to look for.
 * If the user prompt already contains URLs, we trust them and only ask the
 * model for the focus statement. Otherwise the model suggests up to 3 URLs.
 */
export async function planMission(prompt: string): Promise<AnalystPlan> {
  const userUrls = extractUrls(prompt);

  if (userUrls.length > 0) {
    const focus = await chat(
      [
        {
          role: "system",
          content:
            PONYTAIL +
            "\n\nYou are a research analyst. Given a user task and the URLs they provided, restate in ONE short sentence (max 22 words) what specific information should be extracted from those pages. No preamble, no quotes.",
        },
        { role: "user", content: `Task: ${prompt}\n\nURLs: ${userUrls.join(", ")}` },
      ],
      { maxTokens: 80, temperature: 0.1 },
    );
    return { urls: userUrls, focus: focus.content.replace(/^["']|["']$/g, ""), model: focus.model };
  }

  const raw = await chat(
    [
      {
        role: "system",
        content:
          PONYTAIL +
          '\n\nYou are a research analyst planning a web scrape. Respond with STRICT JSON only (no markdown fences) of shape {"urls":["https://..."],"focus":"one sentence"}. Pick 1-3 concrete, publicly reachable HTTPS URLs that would answer the task. Prefer official sources, docs, or well-known aggregators. No search-engine URLs.',
      },

      { role: "user", content: prompt },
    ],
    { maxTokens: 220, temperature: 0.2 },
  );

  try {
    const cleaned = raw.content.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
    const parsed = JSON.parse(cleaned) as { urls?: unknown; focus?: unknown };
    const urls = Array.isArray(parsed.urls)
      ? parsed.urls.filter((u): u is string => typeof u === "string" && /^https?:\/\//.test(u)).slice(0, 3)
      : [];
    const focus = typeof parsed.focus === "string" ? parsed.focus : "";
    if (urls.length === 0) throw new Error("no urls");
    return { urls, focus: focus || "Extract the requested information.", model: raw.model };
  } catch {
    throw new Error(
      "AI planner could not select target URLs for this prompt. Try including a URL directly, e.g. 'summarise https://…'.",
    );
  }
}

/**
 * Feed the scraped page content back to Llama and get a synthesized answer.
 * Kept short and grounded — the receipt is the trust anchor, not the prose.
 */
export async function synthesizeAnswer(
  prompt: string,
  focus: string,
  sources: { url: string; excerpt: string }[],
): Promise<{ answer: string; model: string }> {
  const context = sources
    .map((s, i) => `[Source ${i + 1}] ${s.url}\n${s.excerpt.slice(0, 3500)}`)
    .join("\n\n---\n\n");
  const result = await chat(
    [
      {
        role: "system",
        content:
          PONYTAIL +
          "\n\nYou are a research analyst. Answer the user's task using ONLY the provided sources. Be concise (max ~100 words), cite sources inline as [1], [2]. If the sources do not contain the answer, say so in one line. No preamble, no closing summary.",
      },

      {
        role: "user",
        content: `Task: ${prompt}\nFocus: ${focus}\n\nSources:\n${context}`,
      },
    ],
    { maxTokens: 400, temperature: 0.2 },
  );
  return { answer: result.content, model: result.model };
}
