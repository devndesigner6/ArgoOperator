import { Plane, LineChart, Scale, Search, Wind, Bot, Newspaper, Globe, Brain, type LucideIcon } from "lucide-react";

export type Agent = {
  id: string;
  name: string;
  tagline: string;
  description: string;
  icon: LucideIcon;
  priceAda: number;
  priceUnit: string;
  category: "browse" | "monitor" | "research" | "defi" | "custom";
  masumiDid: string | null;
  reputation: number | null;
  completed: number | null;
  avgSeconds: number | null;
  skills: string[];
  status: "live" | "beta" | "coming-soon";
};

// Registry is intentionally small and honest: only agents we're actually
// wiring for the hackathon are marked live. Others are labelled coming-soon.
export const AGENTS: Agent[] = [
  {
    id: "ai-analyst",
    name: "AI Research Analyst",
    tagline: "Llama 3.3 70B plans the scrape, Steel executes, LLM synthesizes",
    description:
      "Give it a research task in plain English. Cerebras-hosted Llama 3.3 70B picks the URLs to scout, Steel opens each in a real browser, and the model synthesizes a cited answer. The full trace (plan → sources → answer) is Ed25519-signed and settled on Cardano Preprod.",
    icon: Brain,
    priceAda: 2,
    priceUnit: "per report",
    category: "research",
    masumiDid: null,
    reputation: null,
    completed: null,
    avgSeconds: 25,
    skills: ["llm-plan", "web-navigate", "dom-extract", "llm-synthesize", "poe-signed"],
    status: "live",
  },
  {
    id: "cardano-dex-scout",
    name: "Cardano DEX Arbitrage Scout",
    tagline: "Scrapes Minswap & SundaeSwap — best-effort, SPA-fragile",
    description:
      "Boots a Steel browser, opens Minswap and SundaeSwap, and tries to extract pool prices for ADA pairs. Both venues are heavy SPAs — extraction succeeds only when the rendered HTML surfaces numeric prices. Screenshots are always captured as raw evidence, and the run is signed either way. Marked beta for that reason.",
    icon: LineChart,
    priceAda: 3,
    priceUnit: "per scan",
    category: "defi",
    masumiDid: null,
    reputation: null,
    completed: null,
    avgSeconds: 45,
    skills: ["web-navigate", "dom-extract", "vision-fallback", "poe-signed"],
    status: "beta",
  },

  {
    id: "hn-digest",
    name: "Hacker News Digest",
    tagline: "Scrapes the HN front page and returns a signed top-10",
    description:
      "Opens news.ycombinator.com in a real Steel browser, extracts the current top stories with points and URLs, and returns a signed digest.",
    icon: Newspaper,
    priceAda: 1,
    priceUnit: "per digest",
    category: "research",
    masumiDid: null,
    reputation: null,
    completed: null,
    avgSeconds: 15,
    skills: ["web-navigate", "dom-extract", "poe-signed"],
    status: "live",
  },
  {
    id: "url-scout",
    name: "URL Scout",
    tagline: "Point it at any URL — get markdown, screenshot, and a hash",
    description:
      "Paste any URL in your mission prompt. The scout opens it in Steel's browser, returns the rendered markdown, a full-page screenshot, and an Ed25519-signed receipt.",
    icon: Globe,
    priceAda: 0.5,
    priceUnit: "per page",
    category: "browse",
    masumiDid: null,
    reputation: null,
    completed: null,
    avgSeconds: 12,
    skills: ["web-navigate", "screenshot", "poe-signed"],
    status: "live",
  },
  {
    id: "price-sentinel",
    name: "Price Sentinel",
    tagline: "Point it at a product URL — get the current price",
    description:
      "Give it any product/listing URL in your prompt. Steel opens the page, extracts the first plausible price (currency-aware regex over the rendered markdown), and returns a signed snapshot with a screenshot as evidence.",
    icon: Search,
    priceAda: 0.5,
    priceUnit: "per check",
    category: "monitor",
    masumiDid: null,
    reputation: null,
    completed: null,
    avgSeconds: 20,
    skills: ["web-navigate", "dom-extract", "poe-signed"],
    status: "live",
  },
  {
    id: "github-trending",
    name: "GitHub Trending",
    tagline: "Scrapes github.com/trending and returns the top repos",
    description:
      "Opens github.com/trending in a real Steel browser, extracts the top 10 trending repositories with stars and descriptions, and returns a signed digest.",
    icon: LineChart,
    priceAda: 1,
    priceUnit: "per digest",
    category: "research",
    masumiDid: null,
    reputation: null,
    completed: null,
    avgSeconds: 15,
    skills: ["web-navigate", "dom-extract", "poe-signed"],
    status: "live",
  },
  {
    id: "flight-booker",
    name: "Flight Booker",
    tagline: "End-to-end fare search across airlines",
    description:
      "Multi-tab browser session across airline sites, extracts fares, holds the best option and returns a checkout link with a signed screenshot as PoE.",
    icon: Plane,
    priceAda: 4,
    priceUnit: "per booking",
    category: "browse",
    masumiDid: null,
    reputation: null,
    completed: null,
    avgSeconds: 180,
    skills: ["web-navigate", "form-fill", "vision", "poe-signed"],
    status: "coming-soon",
  },
  {
    id: "legal-researcher",
    name: "Legal Researcher",
    tagline: "Pulls filings, opinions and citations",
    description:
      "Runs a browser session against public court/legal databases, extracts relevant filings, and returns a structured brief with source links.",
    icon: Scale,
    priceAda: 12,
    priceUnit: "per brief",
    category: "research",
    masumiDid: null,
    reputation: null,
    completed: null,
    avgSeconds: 240,
    skills: ["web-navigate", "extract", "summarize"],
    status: "coming-soon",
  },
  {
    id: "defi-yield-harvester",
    name: "DeFi Yield Harvester",
    tagline: "Navigates dApps and prepares strategy tx",
    description:
      "Walks Cardano DeFi dApps, evaluates yield strategies, and prepares an unsigned transaction for you to review and sign from your wallet.",
    icon: Wind,
    priceAda: 0,
    priceUnit: "revenue share",
    category: "defi",
    masumiDid: null,
    reputation: null,
    completed: null,
    avgSeconds: 300,
    skills: ["web-navigate", "cip30", "tx-build"],
    status: "coming-soon",
  },
  {
    id: "custom",
    name: "Build your own Argo-bot",
    tagline: "Fork the template, set a price, list on-chain",
    description:
      "Use the open Argo agent template to build a specialist. Register on Masumi to receive a DID and start accepting missions in ADA.",
    icon: Bot,
    priceAda: 0,
    priceUnit: "you set",
    category: "custom",
    masumiDid: null,
    reputation: null,
    completed: null,
    avgSeconds: null,
    skills: ["template", "cli"],
    status: "coming-soon",
  },
];

export function getAgent(id: string) {
  return AGENTS.find((a) => a.id === id) ?? null;
}
