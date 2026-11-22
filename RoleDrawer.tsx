import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  Check,
  Loader2,
  Plus,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  ShieldX,
  Trash2,
  X,
} from "lucide-react";
import { COPY } from "../data/i18n.ts";
import { getRoleById, RESPONSE_STYLES, ROLES } from "../data/roles.ts";
import { checkUrlSafety } from "../services/chatApi.ts";
import type {
  ChatThread,
  Language,
  LinkSafetyReport,
  MemoryState,
  ResponseStyle,
  RoleId,
} from "../types/chat.ts";

interface RoleDrawerProps {
  open: boolean;
  thread: ChatThread;
  language: Language;
  memory: MemoryState;
  autoSpeak: boolean;
  safeBrowsingConfigured: boolean | null;
  onClose: () => void;
  onSelectRole: (roleId: RoleId) => void;
  onSelectResponseStyle: (style: ResponseStyle) => void;
  onUpdateCustomInstruction: (instruction: string | undefined) => void;
  onToggleAutoSpeak: () => void;
  onToggleMemoryConsent: () => void;
  onAddMemory: (content: string) => void;
  onDeleteMemory: (id: string) => void;
  onClearMemory: () => void;
  onInspectSafetyReport: (report: LinkSafetyReport) => void;
}

export function RoleDrawer({
  open,
  thread,
  language,
  memory,
  autoSpeak,
  safeBrowsingConfigured,
  onClose,
  onSelectRole,
  onSelectResponseStyle,
  onUpdateCustomInstruction,
  onToggleAutoSpeak,
  onToggleMemoryConsent,
  onAddMemory,
  onDeleteMemory,
  onClearMemory,
  onInspectSafetyReport,
}: RoleDrawerProps) {
  const t = COPY[language];
  const currentRole = getRoleById(thread.roleId);
  const effectiveInstruction =
    thread.customSystemInstruction ?? currentRole.systemInstruction[language];

  const [activeTab, setActiveTab] = useState<"persona" | "memory" | "security">(
    "persona"
  );
  const [draft, setDraft] = useState(effectiveInstruction);
  const [justSaved, setJustSaved] = useState(false);
  const [memoryInput, setMemoryInput] = useState("");

  // Live link safety scanner inside Security tab
  const [urlToCheck, setUrlToCheck] = useState("");
  const [checkingUrl, setCheckingUrl] = useState(false);
  const [lastScanReport, setLastScanReport] =
    useState<LinkSafetyReport | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);

  useEffect(() => {
    setDraft(effectiveInstruction);
  }, [effectiveInstruction, thread.id]);

  const isDirty = draft.trim() !== effectiveInstruction.trim();
  const isCustom =
    typeof thread.customSystemInstruction === "string" &&
    thread.customSystemInstruction.trim().length > 0 &&
    thread.customSystemInstruction.trim() !==
      currentRole.systemInstruction[language].trim();

  const handleSave = () => {
    const cleaned = draft.trim();
    if (
      !cleaned ||
      cleaned === currentRole.systemInstruction[language].trim()
    ) {
      onUpdateCustomInstruction(undefined);
    } else {
      onUpdateCustomInstruction(cleaned);
    }
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 1600);
  };

  const handleReset = () => {
    onUpdateCustomInstruction(undefined);
    setDraft(currentRole.systemInstruction[language]);
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 1600);
  };

  const handleMemorySubmit = (e: FormEvent) => {
    e.preventDefault();
    const cleaned = memoryInput.trim();
    if (!cleaned) return;
    onAddMemory(cleaned);
    setMemoryInput("");
  };

  const handleCheckUrlSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const candidate = urlToCheck.trim();
    if (!candidate) return;
    setCheckingUrl(true);
    setScanError(null);
    try {
      const report = await checkUrlSafety(candidate);
      setLastScanReport(report);
    } catch (err) {
      setScanError(err instanceof Error ? err.message : t.networkError);
    } finally {
      setCheckingUrl(false);
    }
  };

  const drawerOffset = language === "ar" ? -420 : 420;

  return (
    <AnimatePresence>
      {open ? (
        <div
          className="fixed inset-0 z-40 flex justify-end"
          role="dialog"
          aria-modal="true"
          aria-label={t.settingsButton}
        >
          <motion.button
            type="button"
            aria-label={t.closePanel}
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 bg-slate-950/45 backdrop-blur-[1px]"
          />

          <motion.aside
            initial={{ x: drawerOffset }}
            animate={{ x: 0 }}
            exit={{ x: drawerOffset }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 flex h-full w-full max-w-md flex-col border-s border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-[#0D1526]"
          >
            {/* Header */}
            <div className="flex h-14 shrink-0 items-center justify-between border-b border-slate-200 px-5 dark:border-slate-800">
              <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white">
                {t.settingsButton}
              </h2>
              <button
                type="button"
                onClick={onClose}
                aria-label={t.closePanel}
                className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-teal-600 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            {/* 3 Clean Tabs: Persona / Memory / Security */}
            <div className="shrink-0 border-b border-slate-200 px-5 py-3 dark:border-slate-800">
              <div
                role="tablist"
                className="grid grid-cols-3 gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800/90"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === "persona"}
                  onClick={() => setActiveTab("persona")}
                  className={`h-8 rounded-lg px-2 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                    activeTab === "persona"
                      ? "bg-white text-slate-900 shadow-xs dark:bg-slate-950 dark:text-white"
                      : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
                  }`}
                >
                  {t.tabPersona}
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === "memory"}
                  onClick={() => setActiveTab("memory")}
                  className={`h-8 rounded-lg px-2 text-xs font-medium transition-colors whitespace-nowrap shrink-0 tabular-nums ${
                    activeTab === "memory"
                      ? "bg-white text-slate-900 shadow-xs dark:bg-slate-950 dark:text-white"
                      : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
                  }`}
                >
                  {t.tabMemory}
                  {memory.items.length > 0 ? ` (${memory.items.length})` : ""}
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === "security"}
                  onClick={() => setActiveTab("security")}
                  className={`h-8 rounded-lg px-2 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                    activeTab === "security"
                      ? "bg-white text-slate-900 shadow-xs dark:bg-slate-950 dark:text-white"
                      : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
                  }`}
                >
                  {t.tabSecurity}
                </button>
              </div>
            </div>

            {/* Scrollable Body */}
            <div className="nova-scroll flex-1 overflow-y-auto px-5 py-5">
              {activeTab === "persona" ? (
                <>
                  {/* Response Style */}
                  <div className="mb-6">
                    <p className="mb-2.5 text-xs font-medium text-slate-500 dark:text-slate-400">
                      {t.responseStyleLabel}
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {RESPONSE_STYLES.map((style) => {
                        const selected = thread.responseStyle === style.id;
                        return (
                          <button
                            key={style.id}
                            type="button"
                            onClick={() => onSelectResponseStyle(style.id)}
                            className={`rounded-xl border px-3 py-2.5 text-start transition-colors focus-visible:outline-2 focus-visible:outline-teal-600 ${
                              selected
                                ? "border-teal-600 bg-teal-50/75 dark:border-teal-500 dark:bg-teal-950/35"
                                : "border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900/50 dark:hover:bg-slate-800/60"
                            }`}
                          >
                            <div
                              className={`text-xs font-semibold ${
                                selected
                                  ? "text-teal-800 dark:text-teal-300"
                                  : "text-slate-900 dark:text-slate-100"
                              }`}
                            >
                              {style.label[language]}
                            </div>
                            <div className="mt-1 text-[11.5px] leading-snug text-slate-600 dark:text-slate-400">
                              {style.description[language]}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Voice auto-speak switch */}
                  <div className="mb-6 flex items-start justify-between gap-4 border-y border-slate-200 py-4 dark:border-slate-800">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-slate-900 dark:text-white">
                        {t.autoSpeakLabel}
                      </div>
                      <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                        {t.autoSpeakHint}
                      </p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={autoSpeak}
                      onClick={onToggleAutoSpeak}
                      className={`relative mt-0.5 inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 ${
                        autoSpeak
                          ? "bg-teal-700 dark:bg-teal-500"
                          : "bg-slate-300 dark:bg-slate-700"
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 rounded-full bg-white shadow-xs transition-transform ${
                          autoSpeak
                            ? "ltr:translate-x-6 rtl:-translate-x-6"
                            : "ltr:translate-x-1 rtl:-translate-x-1"
                        }`}
                      />
                    </button>
                  </div>

                  {/* Role list */}
                  <div>
                    <p className="mb-3 text-xs font-medium text-slate-500 dark:text-slate-400">
                      {t.activeRole}
                    </p>
                    <div className="divide-y divide-slate-200/80 overflow-hidden rounded-xl border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
                      {ROLES.map((role) => {
                        const selected = role.id === thread.roleId;
                        return (
                          <button
                            key={role.id}
                            type="button"
                            onClick={() => onSelectRole(role.id)}
                            className={`flex w-full items-start justify-between gap-3 px-4 py-3 text-start transition-colors focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-teal-600 ${
                              selected
                                ? "bg-teal-50/75 dark:bg-teal-950/35"
                                : "bg-white hover:bg-slate-50 dark:bg-[#0D1526] dark:hover:bg-slate-800/60"
                            }`}
                          >
                            <div className="min-w-0 flex-1">
                              <span
                                className={`text-sm font-semibold ${
                                  selected
                                    ? "text-teal-800 dark:text-teal-300"
                                    : "text-slate-900 dark:text-slate-100"
                                }`}
                              >
                                {role.name[language]}
                              </span>
                              <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                                {role.summary[language]}
                              </p>
                            </div>
                            {selected ? (
                              <Check
                                className="mt-0.5 h-4 w-4 shrink-0 text-teal-700 dark:text-teal-400"
                                aria-hidden="true"
                              />
                            ) : null}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* System instruction editor */}
                  <div className="mt-6 border-t border-slate-200 pt-6 dark:border-slate-800">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <label
                        htmlFor="nova-system-instruction"
                        className="text-sm font-semibold text-slate-900 dark:text-white"
                      >
                        {t.systemInstructionLabel}
                      </label>
                      {isCustom ? (
                        <span className="text-xs font-medium text-teal-700 dark:text-teal-400">
                          {t.customRoleIndicator}
                        </span>
                      ) : null}
                    </div>
                    <p className="mb-3 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                      {t.systemInstructionHint}
                    </p>
                    <textarea
                      id="nova-system-instruction"
                      rows={5}
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      className="nova-scroll w-full resize-y rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 text-sm leading-relaxed text-slate-900 transition-colors focus:border-teal-600 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-teal-500"
                    />
                    <div className="mt-3 flex items-center justify-between gap-3">
                      <button
                        type="button"
                        onClick={handleReset}
                        disabled={!isCustom && !isDirty}
                        className="inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-45 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100 whitespace-nowrap shrink-0"
                      >
                        <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>{t.resetInstruction}</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleSave}
                        disabled={!isDirty}
                        className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-teal-700 px-4 text-xs font-medium text-white transition-colors hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-45 dark:bg-teal-600 dark:hover:bg-teal-500 whitespace-nowrap shrink-0"
                      >
                        {justSaved ? (
                          <>
                            <Check className="h-3.5 w-3.5" aria-hidden="true" />
                            <span>{t.savedNotice}</span>
                          </>
                        ) : (
                          <span>{t.saveInstruction}</span>
                        )}
                      </button>
                    </div>
                  </div>
                </>
              ) : activeTab === "memory" ? (
                /* Memory Tab */
                <div>
                  <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-5 dark:border-slate-800">
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                        {t.memoryConsentLabel}
                      </h3>
                      <p className="mt-1.5 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                        {t.memoryConsentHint}
                      </p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={memory.enabled}
                      onClick={onToggleMemoryConsent}
                      className={`relative mt-0.5 inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 ${
                        memory.enabled
                          ? "bg-teal-700 dark:bg-teal-500"
                          : "bg-slate-300 dark:bg-slate-700"
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 rounded-full bg-white shadow-xs transition-transform ${
                          memory.enabled
                            ? "ltr:translate-x-6 rtl:-translate-x-6"
                            : "ltr:translate-x-1 rtl:-translate-x-1"
                        }`}
                      />
                    </button>
                  </div>

                  <form onSubmit={handleMemorySubmit} className="mt-5 flex gap-2">
                    <input
                      type="text"
                      value={memoryInput}
                      onChange={(e) => setMemoryInput(e.target.value)}
                      placeholder={t.memoryAddPlaceholder}
                      className="h-10 min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50/70 px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-600 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-teal-500"
                    />
                    <button
                      type="submit"
                      disabled={!memoryInput.trim()}
                      className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-teal-700 px-3.5 text-xs font-medium text-white transition-colors hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-45 dark:bg-teal-600 dark:hover:bg-teal-500 whitespace-nowrap shrink-0"
                    >
                      <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>{t.memoryAddButton}</span>
                    </button>
                  </form>

                  <div className="mt-5">
                    <div className="mb-2.5 flex items-center justify-between">
                      <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                        {t.memoryTitle}
                      </span>
                      {memory.items.length > 0 ? (
                        <button
                          type="button"
                          onClick={onClearMemory}
                          className="text-xs font-medium text-rose-600 transition-colors hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300 whitespace-nowrap shrink-0"
                        >
                          {t.memoryClearAll}
                        </button>
                      ) : null}
                    </div>

                    {memory.items.length === 0 ? (
                      <p className="rounded-xl border border-slate-200/90 px-4 py-8 text-center text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
                        {t.memoryEmpty}
                      </p>
                    ) : (
                      <ul className="divide-y divide-slate-200/80 rounded-xl border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
                        {memory.items.map((item) => (
                          <li
                            key={item.id}
                            className="flex items-start justify-between gap-3 px-3.5 py-3"
                          >
                            <div className="min-w-0 flex-1">
                              <p className="text-sm leading-relaxed text-slate-800 dark:text-slate-200">
                                {item.content}
                              </p>
                              <span className="mt-1 block text-[11px] text-slate-500 dark:text-slate-400">
                                {item.source === "auto"
                                  ? t.memoryAutoTag
                                  : t.memoryManualTag}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => onDeleteMemory(item.id)}
                              aria-label={t.deleteThread}
                              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-rose-600 dark:hover:bg-slate-800 dark:hover:text-rose-400"
                            >
                              <Trash2
                                className="h-3.5 w-3.5"
                                aria-hidden="true"
                              />
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              ) : (
                /* Security & Link Guard Tab */
                <div>
                  {safeBrowsingConfigured === false ? (
                    <div
                      role="status"
                      className="mb-5 flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50/85 px-3.5 py-3 text-xs text-amber-900 dark:border-amber-900/70 dark:bg-amber-950/35 dark:text-amber-200"
                    >
                      <ShieldAlert
                        className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400"
                        aria-hidden="true"
                      />
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="font-semibold">
                          {t.safeBrowsingUnavailableCardTitle}
                        </div>
                        <p className="leading-relaxed">
                          {t.safeBrowsingUnavailableCardBody}
                        </p>
                      </div>
                    </div>
                  ) : null}

                  <div className="border-b border-slate-200 pb-5 dark:border-slate-800">
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                      <ShieldCheck
                        className="h-4 w-4 text-teal-700 dark:text-teal-400"
                        aria-hidden="true"
                      />
                      <h3>{t.securityTitle}</h3>
                    </div>
                    <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                      {t.securitySubtitle}
                    </p>
                    <ul className="mt-4 space-y-2 text-xs leading-relaxed text-slate-700 dark:text-slate-300">
                      {t.securityRulesList.map((rule, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span
                            aria-hidden="true"
                            className="mt-0.5 font-mono text-teal-700 dark:text-teal-400"
                          >
                            0{idx + 1}.
                          </span>
                          <span>{rule}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Interactive Real-Time URL Scanner */}
                  <div className="mt-5">
                    <label
                      htmlFor="nova-url-scanner"
                      className="mb-2 block text-xs font-semibold text-slate-800 dark:text-slate-200"
                    >
                      {t.securityTesterLabel}
                    </label>
                    <form
                      onSubmit={handleCheckUrlSubmit}
                      className="flex gap-2"
                    >
                      <input
                        id="nova-url-scanner"
                        type="text"
                        dir="ltr"
                        value={urlToCheck}
                        onChange={(e) => setUrlToCheck(e.target.value)}
                        placeholder={t.securityTesterPlaceholder}
                        className="h-10 min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50/70 px-3 font-mono text-xs text-slate-900 placeholder:text-slate-400 focus:border-teal-600 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-teal-500"
                      />
                      <button
                        type="submit"
                        disabled={!urlToCheck.trim() || checkingUrl}
                        className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-teal-700 px-4 text-xs font-medium text-white transition-colors hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-45 dark:bg-teal-600 dark:hover:bg-teal-500 whitespace-nowrap shrink-0"
                      >
                        {checkingUrl ? (
                          <Loader2
                            className="h-3.5 w-3.5 animate-spin"
                            aria-hidden="true"
                          />
                        ) : (
                          <span>{t.securityTesterButton}</span>
                        )}
                      </button>
                    </form>

                    {scanError ? (
                      <p
                        role="alert"
                        className="mt-2.5 text-xs text-rose-600 dark:text-rose-400"
                      >
                        {scanError}
                      </p>
                    ) : null}

                    {lastScanReport ? (
                      <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50/80 p-3.5 dark:border-slate-800 dark:bg-slate-900/70">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 text-xs font-semibold">
                            {lastScanReport.verdict === "danger" ? (
                              <ShieldX className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                            ) : lastScanReport.verdict === "caution" ||
                              lastScanReport.verdict === "unavailable" ? (
                              <ShieldAlert className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                            ) : (
                              <ShieldCheck className="h-4 w-4 text-teal-700 dark:text-teal-400" />
                            )}
                            <span className="text-slate-900 dark:text-white">
                              {lastScanReport.verdict === "danger"
                                ? t.verdictDanger
                                : lastScanReport.verdict === "caution"
                                  ? t.verdictCaution
                                  : lastScanReport.verdict === "unavailable"
                                    ? t.verdictUnavailable
                                    : t.verdictSafe}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => onInspectSafetyReport(lastScanReport)}
                            className="text-xs font-medium text-teal-700 hover:text-sky-700 dark:text-teal-400 dark:hover:text-sky-300"
                          >
                            {t.inspectLinkReport}
                          </button>
                        </div>

                        <p
                          dir="ltr"
                          className="mt-2 break-all font-mono text-[11px] text-slate-500 dark:text-slate-400"
                        >
                          {lastScanReport.resolvedUrl}
                        </p>

                        <ul className="mt-2.5 space-y-1 text-xs leading-relaxed text-slate-700 dark:text-slate-300">
                          {lastScanReport.reasons[language].map((r, i) => (
                            <li key={i}>• {r}</li>
                          ))}
                        </ul>

                        <div className="mt-2.5 text-[11px] text-slate-500 dark:text-slate-400">
                          {lastScanReport.checkedProviders.join(" · ")}
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              )}
            </div>
          </motion.aside>
        </div>
      ) : null}
    </AnimatePresence>
  );
}
