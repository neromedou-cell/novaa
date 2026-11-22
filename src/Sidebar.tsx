import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Globe, Moon, Plus, Search, Sun, Trash2, X } from "lucide-react";
import { COPY } from "../data/i18n.ts";
import { getRoleById } from "../data/roles.ts";
import type { ChatThread, Language, ThemeMode } from "../types/chat.ts";
import { formatTime } from "../utils/storage.ts";
import { NovaLogo } from "./NovaLogo.tsx";

interface SidebarProps {
  threads: ChatThread[];
  activeThreadId: string;
  language: Language;
  theme: ThemeMode;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  onSelectThread: (id: string) => void;
  onNewThread: () => void;
  onDeleteThread: (id: string) => void;
  onToggleLanguage: () => void;
  onToggleTheme: () => void;
}

export function Sidebar({
  threads,
  activeThreadId,
  language,
  theme,
  mobileOpen,
  onCloseMobile,
  onSelectThread,
  onNewThread,
  onDeleteThread,
  onToggleLanguage,
  onToggleTheme,
}: SidebarProps) {
  const [query, setQuery] = useState("");
  const t = COPY[language];

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const sorted = [...threads].sort((a, b) => b.updatedAt - a.updatedAt);
    if (!q) return sorted;
    return sorted.filter(
      (thread) =>
        thread.title.toLowerCase().includes(q) ||
        thread.messages.some((m) => m.text.toLowerCase().includes(q))
    );
  }, [threads, query]);

  const { todayThreads, earlierThreads } = useMemo(() => {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const cutoff = startOfToday.getTime();
    return {
      todayThreads: filtered.filter((th) => th.updatedAt >= cutoff),
      earlierThreads: filtered.filter((th) => th.updatedAt < cutoff),
    };
  }, [filtered]);

  const renderGroup = (label: string, items: ChatThread[]) => {
    if (items.length === 0) return null;
    return (
      <div className="mb-5">
        <div className="mb-1.5 px-2.5 text-xs font-medium text-slate-500 dark:text-slate-400">
          {label}
        </div>
        <ul className="space-y-1">
          {items.map((thread) => {
            const isActive = thread.id === activeThreadId;
            const role = getRoleById(thread.roleId);
            return (
              <li key={thread.id} className="group relative">
                <button
                  type="button"
                  onClick={() => {
                    onSelectThread(thread.id);
                    onCloseMobile();
                  }}
                  className={`flex w-full flex-col rounded-xl px-3 py-2.5 text-start transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 ${
                    isActive
                      ? "bg-white text-slate-900 shadow-xs ring-1 ring-teal-600/20 dark:bg-slate-800/95 dark:text-white dark:ring-teal-500/25"
                      : "text-slate-700 hover:bg-slate-200/60 dark:text-slate-300 dark:hover:bg-slate-800/50"
                  }`}
                >
                  <span className="block w-full truncate pe-7 text-sm font-medium">
                    {!thread.isAutoTitled && thread.messages.length === 0
                      ? t.untitledThread
                      : thread.title || t.untitledThread}
                  </span>
                  <span className="mt-1 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                    <span className="truncate">{role.shortLabel[language]}</span>
                    <span aria-hidden="true">·</span>
                    <span className="shrink-0">
                      {formatTime(thread.updatedAt, language)}
                    </span>
                  </span>
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteThread(thread.id);
                  }}
                  aria-label={t.deleteThread}
                  title={t.deleteThread}
                  className="absolute end-2 top-2.5 flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 opacity-0 transition-opacity hover:bg-slate-200 hover:text-rose-600 focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-teal-600 group-hover:opacity-100 dark:hover:bg-slate-700 dark:hover:text-rose-400"
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    );
  };

  const sidebarBody = (
    <div className="flex h-full w-[280px] flex-col border-e border-slate-200/90 bg-[#F1F4F8] dark:border-slate-800 dark:bg-[#0D1526]">
      {/* Brand header */}
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-slate-200/80 px-4 dark:border-slate-800">
        <div className="flex items-center gap-2.5">
          <NovaLogo size="md" variant="solid" />
          <span
            dir="ltr"
            className="bg-gradient-to-r from-slate-900 to-teal-800 bg-clip-text font-display text-base font-bold tracking-tight text-transparent dark:from-white dark:to-teal-300 whitespace-nowrap shrink-0"
          >
            {t.brand}
          </span>
        </div>
        <button
          type="button"
          onClick={onCloseMobile}
          aria-label={t.closePanel}
          className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-200/70 hover:text-slate-900 lg:hidden dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      {/* Primary New Chat + Search */}
      <div className="space-y-3 p-4 pb-3">
        <button
          type="button"
          onClick={() => {
            onNewThread();
            onCloseMobile();
          }}
          className="flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-teal-700 via-cyan-700 to-sky-700 px-4 text-sm font-medium text-white shadow-xs transition-all duration-150 hover:from-teal-800 hover:via-cyan-800 hover:to-sky-800 active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 dark:from-teal-600 dark:via-cyan-600 dark:to-sky-600 dark:hover:from-teal-500 dark:hover:to-sky-500 whitespace-nowrap shrink-0"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          <span>{t.newChat}</span>
        </button>

        <div className="relative">
          <Search
            className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            aria-hidden="true"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t.searchPlaceholder}
            className="h-10 w-full rounded-xl border border-slate-200 bg-white ps-9 pe-3 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:border-teal-600 focus:outline-none dark:border-slate-700/80 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-teal-500"
          />
        </div>
      </div>

      {/* Conversation list */}
      <nav
        aria-label={t.conversations}
        className="nova-scroll flex-1 overflow-y-auto px-3 py-1"
      >
        {filtered.length === 0 ? (
          <p className="px-3 py-8 text-center text-xs text-slate-500 dark:text-slate-400">
            {query.trim() ? t.noSearchMatches : t.noThreads}
          </p>
        ) : (
          <>
            {renderGroup(t.today, todayThreads)}
            {renderGroup(t.earlier, earlierThreads)}
          </>
        )}
      </nav>

      {/* Utility footer: Language & Theme controls */}
      <div className="flex shrink-0 items-center justify-between gap-2 border-t border-slate-200/80 p-3 dark:border-slate-800">
        <button
          type="button"
          onClick={onToggleLanguage}
          className="inline-flex h-10 items-center gap-1.5 rounded-xl px-3 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-200/70 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-teal-600 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white whitespace-nowrap shrink-0"
        >
          <Globe className="h-3.5 w-3.5" aria-hidden="true" />
          <span>{t.langToggle}</span>
        </button>

        <button
          type="button"
          onClick={onToggleTheme}
          aria-label={theme === "dark" ? t.themeLight : t.themeDark}
          className="inline-flex h-10 items-center gap-1.5 rounded-xl px-3 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-200/70 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-teal-600 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white whitespace-nowrap shrink-0"
        >
          {theme === "dark" ? (
            <>
              <Sun className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{t.themeLight}</span>
            </>
          ) : (
            <>
              <Moon className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{t.themeDark}</span>
            </>
          )}
        </button>
      </div>
    </div>
  );

  const slideStartX = language === "ar" ? 280 : -280;

  return (
    <>
      <aside className="hidden h-full shrink-0 lg:flex">{sidebarBody}</aside>

      <AnimatePresence>
        {mobileOpen ? (
          <div
            className="fixed inset-0 z-40 flex lg:hidden"
            role="dialog"
            aria-modal="true"
          >
            <motion.button
              type="button"
              aria-label={t.closePanel}
              onClick={onCloseMobile}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="fixed inset-0 bg-slate-950/50 backdrop-blur-[1px]"
            />
            <motion.div
              initial={{ x: slideStartX }}
              animate={{ x: 0 }}
              exit={{ x: slideStartX }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="relative z-10 flex h-full shadow-2xl"
            >
              {sidebarBody}
            </motion.div>
          </div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
