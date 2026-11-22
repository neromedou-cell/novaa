import type {
  ChatMessage,
  ChatModelId,
  Language,
  LinkSafetyReport,
  ModelTier,
  WebSearchMode,
  WebSource,
} from "../types/chat.ts";

export type StreamErrorCode =
  | "QUOTA_EXCEEDED"
  | "SEARCH_QUOTA_EXCEEDED"
  | "AUTH_ERROR"
  | "GENERAL";

export class ChatStreamError extends Error {
  errorCode?: StreamErrorCode;
  status?: number;
  constructor(message: string, errorCode?: StreamErrorCode, status?: number) {
    super(message);
    this.name = "ChatStreamError";
    this.errorCode = errorCode;
    this.status = status;
  }
}

export interface StreamChatParams {
  messages: ChatMessage[];
  modelTier: ModelTier;
  systemInstruction: string;
  webSearchMode: WebSearchMode;
  language: Language;
  signal?: AbortSignal;
  onChunk: (delta: string) => void;
  onNotice?: (notice: string) => void;
  onStatus?: (status: "searching" | "verifying_links", autoTriggered?: boolean) => void;
  onSources?: (
    sources: WebSource[],
    queries: string[],
    autoTriggered?: boolean
  ) => void;
  onMeta?: (meta: {
    model?: ChatModelId;
    modelTier?: ModelTier;
    webSearchUsed?: boolean;
    autoSearchTriggered?: boolean;
    notice?: string;
  }) => void;
}

export async function streamChatResponse({
  messages,
  modelTier,
  systemInstruction,
  webSearchMode,
  language,
  signal,
  onChunk,
  onNotice,
  onStatus,
  onSources,
  onMeta,
}: StreamChatParams): Promise<void> {
  const payload = {
    modelTier,
    systemInstruction,
    webSearchMode,
    language,
    messages: messages
      .filter(
        (m) =>
          !m.error &&
          (m.text.trim().length > 0 ||
            (m.attachments && m.attachments.length > 0))
      )
      .map((m) => ({
        role: m.role,
        text: m.text,
        attachments: m.attachments?.map((att) => ({
          kind: att.kind,
          mimeType: att.mimeType,
          data: att.data,
          textContent: att.textContent,
          name: att.name,
        })),
      })),
  };

  const response = await fetch("/api/chat/stream", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal,
  });

  if (!response.ok) {
    let errorMsg = `Request failed (${response.status})`;
    try {
      const errJson = (await response.json()) as { error?: string };
      if (errJson?.error) {
        errorMsg = errJson.error;
      }
    } catch {
      // Fallback to status
    }
    throw new Error(errorMsg);
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error("Streaming response body is unavailable.");
  }

  const decoder = new TextDecoder("utf-8");
  let buffer = "";

  const processLine = (line: string) => {
    const trimmed = line.trim();
    if (!trimmed.startsWith("data:")) {
      return;
    }
    const jsonStr = trimmed.slice(5).trim();
    if (!jsonStr) {
      return;
    }

    let parsed: {
      text?: string;
      done?: boolean;
      error?: string;
      errorCode?: StreamErrorCode;
      status?: number;
      notice?: string;
      searchStatus?: "searching" | "verifying_links";
      autoSearchTriggered?: boolean;
      webSearchUsed?: boolean;
      sources?: WebSource[];
      searchQueries?: string[];
      model?: ChatModelId;
      modelTier?: ModelTier;
    };
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      return;
    }

    if (parsed.error) {
      throw new ChatStreamError(parsed.error, parsed.errorCode, parsed.status);
    }
    if (typeof parsed.notice === "string" && parsed.notice.trim().length > 0 && onNotice) {
      onNotice(parsed.notice.trim());
    }
    if (parsed.searchStatus && onStatus) {
      onStatus(parsed.searchStatus, parsed.autoSearchTriggered);
    }
    if (typeof parsed.text === "string" && parsed.text.length > 0) {
      onChunk(parsed.text);
    }
    if (Array.isArray(parsed.sources) && onSources) {
      onSources(
        parsed.sources,
        parsed.searchQueries ?? [],
        parsed.autoSearchTriggered
      );
    }
    if (parsed.done && onMeta) {
      onMeta({
        model: parsed.model,
        modelTier: parsed.modelTier,
        webSearchUsed: parsed.webSearchUsed,
        autoSearchTriggered: parsed.autoSearchTriggered,
        notice: parsed.notice,
      });
    }
  };

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) {
        break;
      }
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        processLine(line);
      }
    }

    buffer += decoder.decode();
    if (buffer.trim().length > 0) {
      for (const line of buffer.split("\n")) {
        processLine(line);
      }
    }
  } finally {
    reader.releaseLock();
  }
}

export async function checkUrlSafety(url: string): Promise<LinkSafetyReport> {
  const res = await fetch("/api/security/check-url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });
  const data = (await res.json()) as LinkSafetyReport & { error?: string };
  if (!res.ok) {
    throw new Error(data.error || `Security check failed (${res.status})`);
  }
  return data;
}

export async function generateThreadTitle(params: {
  userMessage: string;
  assistantMessage: string;
  language: Language;
}): Promise<string | null> {
  try {
    const res = await fetch("/api/chat/title", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });
    if (!res.ok) {
      return null;
    }
    const data = (await res.json()) as { title?: string };
    return typeof data.title === "string" && data.title.trim().length > 0
      ? data.title.trim()
      : null;
  } catch {
    return null;
  }
}

export async function transcribeAudio(params: {
  audioBase64: string;
  mimeType: string;
  language: Language;
}): Promise<string> {
  const res = await fetch("/api/audio/transcribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  const data = (await res.json()) as { text?: string; error?: string };
  if (!res.ok) {
    throw new Error(data.error || `Transcription failed (${res.status})`);
  }
  return (data.text ?? "").trim();
}

export async function synthesizeSpeech(params: {
  text: string;
  language: Language;
}): Promise<string> {
  const res = await fetch("/api/audio/tts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  const data = (await res.json()) as {
    audioBase64?: string;
    mimeType?: string;
    error?: string;
  };
  if (!res.ok || !data.audioBase64) {
    throw new Error(data.error || `Speech synthesis failed (${res.status})`);
  }
  const mime = data.mimeType || "audio/wav";
  return `data:${mime};base64,${data.audioBase64}`;
}

export async function extractMemories(params: {
  userMessage: string;
  assistantMessage: string;
  existingMemories: string[];
  language: Language;
}): Promise<string[]> {
  try {
    const res = await fetch("/api/memory/extract", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { memories?: string[] };
    return Array.isArray(data.memories) ? data.memories : [];
  } catch {
    return [];
  }
}
