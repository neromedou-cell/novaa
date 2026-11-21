export type Language = "ar" | "en";

export type ThemeMode = "light" | "dark";

export type ModelTier = "fast" | "balanced" | "deep";

export type WebSearchMode = "auto" | "on" | "off";

export type ChatModelId = "gemini-4-hydrogen" | "gemini-3.1-flash-lite";

export type RoleId =
  | "general"
  | "coder"
  | "research"
  | "tutor"
  | "writer"
  | "strategist";

export type ResponseStyle = "concise" | "balanced" | "detailed" | "academic";

export type LinkSafetyVerdict = "safe" | "caution" | "danger";

export interface LinkSafetyReport {
  originalUrl: string;
  resolvedUrl: string;
  hostname: string;
  verdict: LinkSafetyVerdict;
  allowOpen: boolean;
  isDownloadRisk: boolean;
  checkedProviders: string[];
  reasons: {
    ar: string[];
    en: string[];
  };
  checkedAt: number;
}

export interface MessageAttachment {
  id: string;
  kind: "image" | "pdf" | "text";
  name: string;
  mimeType: string;
  size: number;
  data?: string;
  textContent?: string;
  previewUrl?: string;
}

export interface WebSource {
  title: string;
  uri: string;
  resolvedUri?: string;
  hostname?: string;
  safety?: LinkSafetyReport;
}

export interface ChatMessage {
  id: string;
  role: "user" | "model";
  text: string;
  createdAt: number;
  model?: ChatModelId;
  modelTier?: ModelTier;
  webSearchUsed?: boolean;
  autoSearchTriggered?: boolean;
  attachments?: MessageAttachment[];
  sources?: WebSource[];
  searchQueries?: string[];
  notice?: string;
  error?: string;
  errorCode?: "QUOTA_EXCEEDED" | "SEARCH_QUOTA_EXCEEDED" | "AUTH_ERROR" | "GENERAL";
}

export interface ChatThread {
  id: string;
  title: string;
  isAutoTitled: boolean;
  roleId: RoleId;
  responseStyle: ResponseStyle;
  webSearchMode: WebSearchMode;
  customSystemInstruction?: string;
  modelTier: ModelTier;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
}

export interface MemoryItem {
  id: string;
  content: string;
  createdAt: number;
  source: "auto" | "manual";
}

export interface MemoryState {
  enabled: boolean;
  items: MemoryItem[];
}

export interface RoleDefinition {
  id: RoleId;
  defaultTier: ModelTier;
  defaultWebSearchMode: WebSearchMode;
  name: Record<Language, string>;
  shortLabel: Record<Language, string>;
  summary: Record<Language, string>;
  systemInstruction: Record<Language, string>;
  starters: Record<Language, Array<{ title: string; prompt: string }>>;
}
