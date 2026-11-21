import { GoogleGenAI, ThinkingLevel } from "@google/genai";

export type ModelTier = "fast" | "balanced" | "deep";

export interface ResolvedModelConfig {
  tier: ModelTier;
  model: "gemini-3.1-flash-lite" | "gemini-4-hydrogen";
  thinkingLevel?: ThinkingLevel;
}

export function resolveModelTier(tier: unknown): ResolvedModelConfig {
  if (tier === "fast") {
    return {
      tier: "fast",
      model: "gemini-3.1-flash-lite",
    };
  }
  if (tier === "deep") {
    return {
      tier: "deep",
      model: "gemini-4-hydrogen",
      thinkingLevel: ThinkingLevel.XHIGH,
    };
  }
  return {
    tier: "balanced",
    model: "gemini-4-hydrogen",
    thinkingLevel: ThinkingLevel.MEDIUM,
  };
}

let cachedClient: GoogleGenAI | null = null;
let cachedBetaClient: GoogleGenAI | null = null;
let cachedApiKey: string | undefined;

function ensureApiKey(): string {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    const err = new Error(
      "GEMINI_API_KEY is not configured on the server. Please check Settings > Secrets."
    ) as Error & { status?: number };
    err.status = 500;
    throw err;
  }
  if (cachedApiKey !== apiKey) {
    cachedClient = null;
    cachedBetaClient = null;
    cachedApiKey = apiKey;
  }
  return apiKey;
}

export function getGeminiClient(): GoogleGenAI {
  const apiKey = ensureApiKey();
  if (!cachedClient) {
    cachedClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return cachedClient;
}

export function getGeminiBetaClient(): GoogleGenAI {
  const apiKey = ensureApiKey();
  if (!cachedBetaClient) {
    cachedBetaClient = new GoogleGenAI({
      apiKey,
      apiVersion: "v1beta",
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return cachedBetaClient;
}
