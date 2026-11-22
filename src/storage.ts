import { getResponseStyleById, getRoleById } from "../data/roles.ts";
import type {
  ChatThread,
  Language,
  MemoryState,
  ModelTier,
  ResponseStyle,
  RoleId,
  ThemeMode,
  WebSearchMode,
} from "../types/chat.ts";

const THREADS_KEY = "nova_threads_v1";
const LEGACY_THREADS_KEY = "zill_threads_v1";
const ACTIVE_THREAD_KEY = "nova_active_thread_v1";
const LEGACY_ACTIVE_THREAD_KEY = "zill_active_thread_v1";
const LANG_KEY = "nova_lang";
const LEGACY_LANG_KEY = "zill_lang";
const THEME_KEY = "nova_theme";
const LEGACY_THEME_KEY = "zill_theme";
const MEMORY_KEY = "nova_memory_v1";
const AUTO_SPEAK_KEY = "nova_auto_speak_v1";

export function generateId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function createThread(roleId: RoleId, language: Language): ChatThread {
  const role = getRoleById(roleId);
  const now = Date.now();
  return {
    id: generateId(),
    title: language === "ar" ? "محادثة جديدة" : "New conversation",
    isAutoTitled: false,
    roleId,
    responseStyle: "balanced",
    webSearchMode: role.defaultWebSearchMode,
    modelTier: role.defaultTier,
    messages: [],
    createdAt: now,
    updatedAt: now,
  };
}

function normalizeThread(raw: Record<string, unknown>): ChatThread {
  const legacyModel = raw.model;
  let modelTier: ModelTier = "balanced";
  if (
    raw.modelTier === "fast" ||
    raw.modelTier === "balanced" ||
    raw.modelTier === "deep"
  ) {
    modelTier = raw.modelTier;
  } else if (legacyModel === "gemini-3.1-flash-lite") {
    modelTier = "fast";
  }

  const validRoles: RoleId[] = [
    "general",
    "coder",
    "research",
    "tutor",
    "writer",
    "strategist",
  ];
  const roleId: RoleId = validRoles.includes(raw.roleId as RoleId)
    ? (raw.roleId as RoleId)
    : "general";

  const validStyles: ResponseStyle[] = [
    "concise",
    "balanced",
    "detailed",
    "academic",
  ];
  const responseStyle: ResponseStyle = validStyles.includes(
    raw.responseStyle as ResponseStyle
  )
    ? (raw.responseStyle as ResponseStyle)
    : "balanced";

  const roleDef = getRoleById(roleId);
  let webSearchMode: WebSearchMode = roleDef.defaultWebSearchMode;
  if (
    raw.webSearchMode === "auto" ||
    raw.webSearchMode === "on" ||
    raw.webSearchMode === "off"
  ) {
    webSearchMode = raw.webSearchMode;
  } else if (typeof raw.webSearchEnabled === "boolean") {
    webSearchMode = raw.webSearchEnabled ? "on" : "auto";
  }

  return {
    id: typeof raw.id === "string" ? raw.id : generateId(),
    title: typeof raw.title === "string" ? raw.title : "محادثة جديدة",
    isAutoTitled: Boolean(raw.isAutoTitled),
    roleId,
    responseStyle,
    webSearchMode,
    customSystemInstruction:
      typeof raw.customSystemInstruction === "string"
        ? raw.customSystemInstruction
        : undefined,
    modelTier,
    messages: Array.isArray(raw.messages) ? raw.messages : [],
    createdAt: typeof raw.createdAt === "number" ? raw.createdAt : Date.now(),
    updatedAt: typeof raw.updatedAt === "number" ? raw.updatedAt : Date.now(),
  };
}

export function loadThreads(): ChatThread[] {
  try {
    const raw =
      localStorage.getItem(THREADS_KEY) ||
      localStorage.getItem(LEGACY_THREADS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (item): item is Record<string, unknown> =>
          Boolean(item) && typeof item === "object"
      )
      .map(normalizeThread);
  } catch {
    return [];
  }
}

export function saveThreads(threads: ChatThread[]): void {
  try {
    localStorage.setItem(THREADS_KEY, JSON.stringify(threads));
  } catch {
    try {
      const slimmed = threads.map((t) => ({
        ...t,
        messages: t.messages.map((m) => ({
          ...m,
          attachments: m.attachments?.map((att) => ({
            ...att,
            data: undefined,
            previewUrl: undefined,
            textContent: att.textContent?.slice(0, 4000),
          })),
        })),
      }));
      localStorage.setItem(THREADS_KEY, JSON.stringify(slimmed));
    } catch {
      // Ignore quota errors
    }
  }
}

export function loadActiveThreadId(): string | null {
  try {
    return (
      localStorage.getItem(ACTIVE_THREAD_KEY) ||
      localStorage.getItem(LEGACY_ACTIVE_THREAD_KEY)
    );
  } catch {
    return null;
  }
}

export function saveActiveThreadId(id: string): void {
  try {
    localStorage.setItem(ACTIVE_THREAD_KEY, id);
  } catch {
    // Ignore
  }
}

export function loadLanguage(): Language {
  try {
    const val =
      localStorage.getItem(LANG_KEY) || localStorage.getItem(LEGACY_LANG_KEY);
    return val === "en" ? "en" : "ar";
  } catch {
    return "ar";
  }
}

export function saveLanguage(lang: Language): void {
  try {
    localStorage.setItem(LANG_KEY, lang);
  } catch {
    // Ignore
  }
}

export function loadTheme(): ThemeMode {
  try {
    const val =
      localStorage.getItem(THEME_KEY) || localStorage.getItem(LEGACY_THEME_KEY);
    return val === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
}

export function saveTheme(theme: ThemeMode): void {
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    // Ignore
  }
}

export function loadMemoryState(): MemoryState {
  try {
    const raw = localStorage.getItem(MEMORY_KEY);
    if (!raw) return { enabled: false, items: [] };
    const parsed = JSON.parse(raw) as Partial<MemoryState>;
    return {
      enabled: Boolean(parsed.enabled),
      items: Array.isArray(parsed.items)
        ? parsed.items.filter(
            (i) => i && typeof i.id === "string" && typeof i.content === "string"
          )
        : [],
    };
  } catch {
    return { enabled: false, items: [] };
  }
}

export function saveMemoryState(memory: MemoryState): void {
  try {
    localStorage.setItem(MEMORY_KEY, JSON.stringify(memory));
  } catch {
    // Ignore
  }
}

export function loadAutoSpeak(): boolean {
  try {
    return localStorage.getItem(AUTO_SPEAK_KEY) === "true";
  } catch {
    return false;
  }
}

export function saveAutoSpeak(enabled: boolean): void {
  try {
    localStorage.setItem(AUTO_SPEAK_KEY, enabled ? "true" : "false");
  } catch {
    // Ignore
  }
}

export function buildEffectiveSystemInstruction(params: {
  thread: ChatThread;
  language: Language;
  memory: MemoryState;
}): string {
  const { thread, language, memory } = params;
  const roleDef = getRoleById(thread.roleId);
  const styleDef = getResponseStyleById(thread.responseStyle);

  const sections: string[] = [
    thread.customSystemInstruction?.trim() ||
      roleDef.systemInstruction[language],
    styleDef.directive[language],
  ];

  if (memory.enabled && memory.items.length > 0) {
    const list = memory.items
      .slice(0, 20)
      .map((item) => `- ${item.content}`)
      .join("\n");
    sections.push(
      language === "ar"
        ? `الذاكرة المحفوظة بموافقة المستخدم (استفد منها بشكل طبيعي عندما تكون ذات صلة دون تكرارها آليًا):\n${list}`
        : `User-consented memory from previous sessions (use naturally when relevant without repeating verbatim):\n${list}`
    );
  }

  return sections.join("\n\n");
}

export function formatTime(timestamp: number, language: Language): string {
  try {
    return new Intl.DateTimeFormat(
      language === "ar" ? "ar-EG-u-nu-latn" : "en-US",
      {
        hour: "2-digit",
        minute: "2-digit",
      }
    ).format(new Date(timestamp));
  } catch {
    const d = new Date(timestamp);
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  }
}

export function formatFileSize(bytes: number, language: Language): string {
  if (bytes < 1024) {
    return language === "ar" ? `${bytes} ب` : `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    const kb = (bytes / 1024).toFixed(1);
    return language === "ar" ? `${kb} ك.ب` : `${kb} KB`;
  }
  const mb = (bytes / (1024 * 1024)).toFixed(1);
  return language === "ar" ? `${mb} م.ب` : `${mb} MB`;
}

export function exportThreadToMarkdown(
  thread: ChatThread,
  language: Language
): void {
  const role = getRoleById(thread.roleId);
  const style = getResponseStyleById(thread.responseStyle);
  const lines: string[] = [
    `# ${thread.title}`,
    "",
    `- **${language === "ar" ? "المساعد" : "Assistant"}:** NOVA AI`,
    `- **${language === "ar" ? "التخصّص" : "Specialization"}:** ${role.name[language]}`,
    `- **${language === "ar" ? "أسلوب الرد" : "Response Style"}:** ${style.label[language]}`,
    `- **${language === "ar" ? "مستوى النموذج" : "Model Tier"}:** ${thread.modelTier}`,
    "",
    "---",
    "",
  ];

  for (const msg of thread.messages) {
    const speaker =
      msg.role === "user"
        ? language === "ar"
          ? "أنت"
          : "You"
        : "NOVA AI";
    lines.push(`### ${speaker}`);
    lines.push("");
    if (msg.attachments && msg.attachments.length > 0) {
      lines.push(
        `_${language === "ar" ? "مرفقات" : "Attachments"}: ${msg.attachments
          .map((a) => a.name)
          .join(", ")}_`
      );
      lines.push("");
    }
    lines.push(msg.text);
    if (msg.sources && msg.sources.length > 0) {
      lines.push("");
      lines.push(`**${language === "ar" ? "المصادر" : "Sources"}:**`);
      for (const src of msg.sources) {
        const href = src.resolvedUri || src.uri;
        lines.push(`- [${src.title}](${href})`);
      }
    }
    lines.push("");
  }

  const blob = new Blob([lines.join("\n")], {
    type: "text/markdown;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  const safeSlug = thread.title
    .replace(/[^\p{L}\p{N}\s_-]/gu, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 48);
  anchor.href = url;
  anchor.download = `${safeSlug || "nova-ai-chat"}.md`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
