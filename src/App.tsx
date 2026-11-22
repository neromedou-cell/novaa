import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MotionConfig } from "motion/react";
import {
  ArrowDown,
  Download,
  Menu,
  SlidersHorizontal,
} from "lucide-react";
import { ChatComposer } from "./components/ChatComposer.tsx";
import { EmptyState } from "./components/EmptyState.tsx";
import { MessageItem } from "./components/MessageItem.tsx";
import { RoleDrawer } from "./components/RoleDrawer.tsx";
import { SafeLinkModal } from "./components/SafeLinkModal.tsx";
import { Sidebar } from "./components/Sidebar.tsx";
import { COPY } from "./data/i18n.ts";
import { getRoleById } from "./data/roles.ts";
import {
  ChatStreamError,
  checkUrlSafety,
  extractMemories,
  generateThreadTitle,
  streamChatResponse,
  synthesizeSpeech,
} from "./services/chatApi.ts";
import type {
  ChatMessage,
  ChatThread,
  Language,
  LinkSafetyReport,
  MemoryState,
  MessageAttachment,
  ModelTier,
  ResponseStyle,
  RoleId,
  ThemeMode,
  WebSearchMode,
} from "./types/chat.ts";
import {
  buildEffectiveSystemInstruction,
  createThread,
  exportThreadToMarkdown,
  generateId,
  loadActiveThreadId,
  loadAutoSpeak,
  loadLanguage,
  loadMemoryState,
  loadTheme,
  loadThreads,
  saveActiveThreadId,
  saveAutoSpeak,
  saveLanguage,
  saveMemoryState,
  saveTheme,
  saveThreads,
} from "./utils/storage.ts";

export default function App() {
  const [language, setLanguage] = useState<Language>(() => loadLanguage());
  const [theme, setTheme] = useState<ThemeMode>(() => loadTheme());
  const [memory, setMemory] = useState<MemoryState>(() => loadMemoryState());
  const [autoSpeak, setAutoSpeak] = useState<boolean>(() => loadAutoSpeak());

  const [threads, setThreads] = useState<ChatThread[]>(() => {
    const saved = loadThreads();
    if (saved.length > 0) return saved;
    return [createThread("general", loadLanguage())];
  });

  const [activeThreadId, setActiveThreadId] = useState<string>(() => {
    const savedActive = loadActiveThreadId();
    const savedThreads = loadThreads();
    if (savedActive && savedThreads.some((t) => t.id === savedActive)) {
      return savedActive;
    }
    return savedThreads[0]?.id ?? "";
  });

  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [roleDrawerOpen, setRoleDrawerOpen] = useState(false);
  const [streamingThreadId, setStreamingThreadId] = useState<string | null>(
    null
  );
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(
    null
  );
  const [streamPhase, setStreamPhase] = useState<
    "thinking" | "searching" | "verifying_links"
  >("thinking");
  const [showScrollBottom, setShowScrollBottom] = useState(false);

  // Safe Link Inspection Modal state
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [linkModalLoading, setLinkModalLoading] = useState(false);
  const [linkModalUrl, setLinkModalUrl] = useState<string | null>(null);
  const [linkModalReport, setLinkModalReport] =
    useState<LinkSafetyReport | null>(null);

  // Voice playback state
  const [audioMessageId, setAudioMessageId] = useState<string | null>(null);
  const [audioPhase, setAudioPhase] = useState<"idle" | "loading" | "playing">(
    "idle"
  );
  const [audioErrorByMsg, setAudioErrorByMsg] = useState<
    Record<string, string>
  >({});

  const abortControllerRef = useRef<AbortController | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isNearBottomRef = useRef(true);
  const activeAudioRef = useRef<HTMLAudioElement | null>(null);
  const audioCacheRef = useRef<Map<string, string>>(new Map());
  const memoryRef = useRef<MemoryState>(memory);
  const autoSpeakRef = useRef<boolean>(autoSpeak);

  useEffect(() => {
    memoryRef.current = memory;
  }, [memory]);

  useEffect(() => {
    autoSpeakRef.current = autoSpeak;
  }, [autoSpeak]);

  const activeThread = useMemo(() => {
    const found = threads.find((th) => th.id === activeThreadId);
    return found ?? threads[0];
  }, [threads, activeThreadId]);

  useEffect(() => {
    if (activeThread && activeThread.id !== activeThreadId) {
      setActiveThreadId(activeThread.id);
    }
  }, [activeThread, activeThreadId]);

  useEffect(() => {
    saveLanguage(language);
    document.documentElement.lang = language;
    document.documentElement.dir = language === "ar" ? "rtl" : "ltr";
  }, [language]);

  useEffect(() => {
    saveTheme(theme);
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  useEffect(() => {
    saveThreads(threads);
  }, [threads]);

  useEffect(() => {
    saveMemoryState(memory);
  }, [memory]);

  useEffect(() => {
    saveAutoSpeak(autoSpeak);
  }, [autoSpeak]);

  useEffect(() => {
    if (activeThread?.id) {
      saveActiveThreadId(activeThread.id);
    }
  }, [activeThread?.id]);

  // Safe Link Guard handler (intercepts inline links & risky sources)
  const handleRequestOpenLink = useCallback(
    async (href: string, existingReport?: LinkSafetyReport) => {
      setLinkModalUrl(href);
      setLinkModalOpen(true);

      if (existingReport) {
        setLinkModalLoading(false);
        setLinkModalReport(existingReport);
        return;
      }

      setLinkModalReport(null);
      setLinkModalLoading(true);
      try {
        const report = await checkUrlSafety(href);
        setLinkModalReport(report);
      } catch {
        setLinkModalReport({
          originalUrl: href,
          resolvedUrl: href,
          hostname: href,
          verdict: "caution",
          allowOpen: /^https?:\/\//i.test(href),
          isDownloadRisk: false,
          checkedProviders: ["Client Fallback Guard"],
          reasons: {
            ar: [
              "تعذّر إكمال الفحص الأمني المباشر للرابط. يُنصح بالحذر والتحقق من النطاق قبل الفتح.",
            ],
            en: [
              "Live security check could not complete. Inspect the domain carefully before opening.",
            ],
          },
          checkedAt: Date.now(),
        });
      } finally {
        setLinkModalLoading(false);
      }
    },
    []
  );

  const handleInspectSafetyReport = useCallback((report: LinkSafetyReport) => {
    setLinkModalUrl(report.resolvedUrl);
    setLinkModalReport(report);
    setLinkModalLoading(false);
    setLinkModalOpen(true);
  }, []);

  const stopAudioPlayback = useCallback(() => {
    if (activeAudioRef.current) {
      activeAudioRef.current.pause();
      activeAudioRef.current.currentTime = 0;
      activeAudioRef.current = null;
    }
    setAudioMessageId(null);
    setAudioPhase("idle");
  }, []);

  useEffect(() => {
    return () => {
      activeAudioRef.current?.pause();
    };
  }, []);

  const handleToggleSpeak = useCallback(
    async (messageId: string, text: string) => {
      if (audioMessageId === messageId && audioPhase === "playing") {
        stopAudioPlayback();
        return;
      }

      stopAudioPlayback();
      setAudioErrorByMsg((prev) => {
        if (!prev[messageId]) return prev;
        const next = { ...prev };
        delete next[messageId];
        return next;
      });
      setAudioMessageId(messageId);
      setAudioPhase("loading");

      try {
        let audioUrl = audioCacheRef.current.get(messageId);
        if (!audioUrl) {
          audioUrl = await synthesizeSpeech({ text, language });
          audioCacheRef.current.set(messageId, audioUrl);
        }

        const audio = new Audio(audioUrl);
        activeAudioRef.current = audio;

        audio.onended = () => {
          if (activeAudioRef.current === audio) {
            activeAudioRef.current = null;
            setAudioMessageId(null);
            setAudioPhase("idle");
          }
        };

        audio.onerror = () => {
          if (activeAudioRef.current === audio) {
            activeAudioRef.current = null;
            setAudioMessageId(null);
            setAudioPhase("idle");
            setAudioErrorByMsg((prev) => ({
              ...prev,
              [messageId]: COPY[language].audioError,
            }));
          }
        };

        setAudioPhase("playing");
        await audio.play();
      } catch (err) {
        setAudioMessageId(null);
        setAudioPhase("idle");
        setAudioErrorByMsg((prev) => ({
          ...prev,
          [messageId]:
            err instanceof Error ? err.message : COPY[language].audioError,
        }));
      }
    },
    [audioMessageId, audioPhase, language, stopAudioPlayback]
  );

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    const container = scrollContainerRef.current;
    if (!container) return;
    container.scrollTo({
      top: container.scrollHeight,
      behavior,
    });
  }, []);

  useEffect(() => {
    if (isNearBottomRef.current) {
      scrollToBottom("auto");
    }
  }, [activeThread?.messages, activeThread?.id, scrollToBottom]);

  const handleScroll = () => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const distanceFromBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight;
    const nearBottom = distanceFromBottom < 96;
    isNearBottomRef.current = nearBottom;
    setShowScrollBottom(
      !nearBottom && (activeThread?.messages.length ?? 0) > 0
    );
  };

  const stopStreaming = useCallback(() => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setStreamingThreadId(null);
    setStreamingMessageId(null);
    setStreamPhase("thinking");
  }, []);

  const handleNewThread = () => {
    if (streamingThreadId) {
      stopStreaming();
    }
    stopAudioPlayback();
    const fresh = createThread(activeThread?.roleId ?? "general", language);
    setThreads((prev) => [fresh, ...prev]);
    setActiveThreadId(fresh.id);
    setShowScrollBottom(false);
    isNearBottomRef.current = true;
  };

  const handleSelectThread = (id: string) => {
    if (streamingThreadId && streamingThreadId !== id) {
      stopStreaming();
    }
    stopAudioPlayback();
    setActiveThreadId(id);
    isNearBottomRef.current = true;
    setShowScrollBottom(false);
  };

  const handleDeleteThread = (id: string) => {
    if (streamingThreadId === id) {
      stopStreaming();
    }
    stopAudioPlayback();
    setThreads((prev) => {
      const remaining = prev.filter((th) => th.id !== id);
      if (remaining.length === 0) {
        const replacement = createThread("general", language);
        setActiveThreadId(replacement.id);
        return [replacement];
      }
      if (id === activeThread?.id) {
        setActiveThreadId(remaining[0].id);
      }
      return remaining;
    });
  };

  const updateThread = useCallback(
    (threadId: string, updater: (thread: ChatThread) => ChatThread) => {
      setThreads((prev) =>
        prev.map((th) => (th.id === threadId ? updater(th) : th))
      );
    },
    []
  );

  const handleSelectRole = (roleId: RoleId) => {
    if (!activeThread) return;
    const roleDef = getRoleById(roleId);
    updateThread(activeThread.id, (th) => ({
      ...th,
      roleId,
      webSearchMode: roleDef.defaultWebSearchMode,
      modelTier:
        th.messages.length === 0 ? roleDef.defaultTier : th.modelTier,
      customSystemInstruction: undefined,
      updatedAt: Date.now(),
    }));
  };

  const handleSelectResponseStyle = (responseStyle: ResponseStyle) => {
    if (!activeThread) return;
    updateThread(activeThread.id, (th) => ({
      ...th,
      responseStyle,
      updatedAt: Date.now(),
    }));
  };

  const handleUpdateCustomInstruction = (instruction: string | undefined) => {
    if (!activeThread) return;
    updateThread(activeThread.id, (th) => ({
      ...th,
      customSystemInstruction: instruction,
      updatedAt: Date.now(),
    }));
  };

  const handleChangeModelTier = (modelTier: ModelTier) => {
    if (!activeThread) return;
    updateThread(activeThread.id, (th) => ({
      ...th,
      modelTier,
    }));
  };

  const handleCycleWebSearchMode = () => {
    if (!activeThread) return;
    const order: WebSearchMode[] = ["auto", "on", "off"];
    const nextIdx = (order.indexOf(activeThread.webSearchMode) + 1) % order.length;
    updateThread(activeThread.id, (th) => ({
      ...th,
      webSearchMode: order[nextIdx],
    }));
  };

  const handleAddMemory = (content: string) => {
    setMemory((prev) => ({
      ...prev,
      enabled: true,
      items: [
        {
          id: generateId(),
          content,
          createdAt: Date.now(),
          source: "manual",
        },
        ...prev.items,
      ],
    }));
  };

  const handleDeleteMemory = (id: string) => {
    setMemory((prev) => ({
      ...prev,
      items: prev.items.filter((item) => item.id !== id),
    }));
  };

  const handleClearMemory = () => {
    setMemory((prev) => ({
      ...prev,
      items: [],
    }));
  };

  const runAssistantTurn = useCallback(
    async (
      threadSnapshot: ChatThread,
      historyForApi: ChatMessage[],
      assistantMsgId: string,
      latestUserText: string
    ) => {
      const controller = new AbortController();
      abortControllerRef.current = controller;
      setStreamingThreadId(threadSnapshot.id);
      setStreamingMessageId(assistantMsgId);
      setStreamPhase(
        threadSnapshot.webSearchMode === "on" ? "searching" : "thinking"
      );

      const systemInstruction = buildEffectiveSystemInstruction({
        thread: threadSnapshot,
        language,
        memory: memoryRef.current,
      });

      let accumulated = "";

      try {
        await streamChatResponse({
          messages: historyForApi,
          modelTier: threadSnapshot.modelTier,
          systemInstruction,
          webSearchMode: threadSnapshot.webSearchMode,
          language,
          signal: controller.signal,
          onStatus: (status, autoTriggered) => {
            setStreamPhase(status);
            if (status === "searching") {
              updateThread(threadSnapshot.id, (th) => ({
                ...th,
                messages: th.messages.map((m) =>
                  m.id === assistantMsgId
                    ? {
                        ...m,
                        webSearchUsed: true,
                        autoSearchTriggered: Boolean(autoTriggered),
                      }
                    : m
                ),
              }));
            }
          },
          onNotice: (notice) => {
            updateThread(threadSnapshot.id, (th) => ({
              ...th,
              messages: th.messages.map((m) =>
                m.id === assistantMsgId ? { ...m, notice } : m
              ),
            }));
          },
          onChunk: (delta) => {
            accumulated += delta;
            updateThread(threadSnapshot.id, (th) => ({
              ...th,
              updatedAt: Date.now(),
              messages: th.messages.map((m) =>
                m.id === assistantMsgId ? { ...m, text: accumulated } : m
              ),
            }));
          },
          onSources: (sources, searchQueries, autoTriggered) => {
            updateThread(threadSnapshot.id, (th) => ({
              ...th,
              messages: th.messages.map((m) =>
                m.id === assistantMsgId
                  ? {
                      ...m,
                      sources,
                      searchQueries,
                      webSearchUsed: true,
                      autoSearchTriggered:
                        autoTriggered ?? m.autoSearchTriggered,
                    }
                  : m
              ),
            }));
          },
          onMeta: (meta) => {
            updateThread(threadSnapshot.id, (th) => ({
              ...th,
              messages: th.messages.map((m) =>
                m.id === assistantMsgId
                  ? {
                      ...m,
                      model: meta.model ?? m.model,
                      modelTier: meta.modelTier ?? m.modelTier,
                      webSearchUsed:
                        meta.webSearchUsed !== undefined
                          ? meta.webSearchUsed
                          : m.webSearchUsed,
                      autoSearchTriggered:
                        meta.autoSearchTriggered !== undefined
                          ? meta.autoSearchTriggered
                          : m.autoSearchTriggered,
                      notice: meta.notice ?? m.notice,
                    }
                  : m
              ),
            }));
          },
        });

        // Paced auto-title after first successful turn to avoid RPM bursts
        if (
          !threadSnapshot.isAutoTitled &&
          latestUserText.trim().length > 0 &&
          accumulated.trim().length > 0
        ) {
          setTimeout(() => {
            generateThreadTitle({
              userMessage: latestUserText,
              assistantMessage: accumulated,
              language,
            }).then((generated) => {
              if (generated) {
                updateThread(threadSnapshot.id, (th) => ({
                  ...th,
                  title: generated,
                  isAutoTitled: true,
                }));
              }
            });
          }, 1500);
        }

        // Paced consented memory extraction (only for substantive messages)
        if (
          memoryRef.current.enabled &&
          latestUserText.trim().length >= 18 &&
          accumulated.trim().length > 0
        ) {
          setTimeout(() => {
            extractMemories({
              userMessage: latestUserText,
              assistantMessage: accumulated,
              existingMemories: memoryRef.current.items.map((i) => i.content),
              language,
            }).then((extracted) => {
              if (extracted.length === 0) return;
              setMemory((prev) => {
                if (!prev.enabled) return prev;
                const existingLower = new Set(
                  prev.items.map((i) => i.content.toLowerCase())
                );
                const freshItems = extracted
                  .filter((c) => !existingLower.has(c.toLowerCase()))
                  .map((content) => ({
                    id: generateId(),
                    content,
                    createdAt: Date.now(),
                    source: "auto" as const,
                  }));
                if (freshItems.length === 0) return prev;
                return {
                  ...prev,
                  items: [...freshItems, ...prev.items].slice(0, 30),
                };
              });
            });
          }, 2500);
        }

        if (autoSpeakRef.current && accumulated.trim().length > 0) {
          handleToggleSpeak(assistantMsgId, accumulated);
        }
      } catch (err) {
        if ((err as Error)?.name === "AbortError") {
          return;
        }
        const message =
          err instanceof Error && err.message
            ? err.message
            : COPY[language].networkError;
        const errorCode =
          err instanceof ChatStreamError ? err.errorCode : "GENERAL";
        updateThread(threadSnapshot.id, (th) => ({
          ...th,
          updatedAt: Date.now(),
          messages: th.messages.map((m) =>
            m.id === assistantMsgId
              ? { ...m, text: accumulated, error: message, errorCode }
              : m
          ),
        }));
      } finally {
        if (abortControllerRef.current === controller) {
          abortControllerRef.current = null;
          setStreamingThreadId(null);
          setStreamingMessageId(null);
          setStreamPhase("thinking");
        }
      }
    },
    [language, updateThread, handleToggleSpeak]
  );

  const handleSendMessage = async (
    text: string,
    attachments: MessageAttachment[]
  ) => {
    if (!activeThread) return;
    if (streamingThreadId) {
      stopStreaming();
    }
    stopAudioPlayback();

    const now = Date.now();
    const userMsg: ChatMessage = {
      id: generateId(),
      role: "user",
      text,
      attachments: attachments.length > 0 ? attachments : undefined,
      createdAt: now,
    };

    const assistantMsg: ChatMessage = {
      id: generateId(),
      role: "model",
      text: "",
      modelTier: activeThread.modelTier,
      createdAt: now + 1,
    };

    const fallbackTitle =
      !activeThread.isAutoTitled && activeThread.messages.length === 0
        ? (
            text ||
            attachments[0]?.name ||
            COPY[language].untitledThread
          ).slice(0, 46)
        : activeThread.title;

    const historyForApi = [...activeThread.messages, userMsg];
    const nextSnapshot: ChatThread = {
      ...activeThread,
      title: fallbackTitle,
      updatedAt: now,
      messages: [...historyForApi, assistantMsg],
    };

    isNearBottomRef.current = true;
    updateThread(activeThread.id, () => nextSnapshot);
    requestAnimationFrame(() => scrollToBottom("smooth"));

    await runAssistantTurn(
      nextSnapshot,
      historyForApi,
      assistantMsg.id,
      text || attachments[0]?.name || ""
    );
  };

  const handleRegenerate = async (overrides?: {
    webSearchMode?: WebSearchMode;
    modelTier?: ModelTier;
  }) => {
    if (!activeThread || streamingThreadId) return;
    const msgs = activeThread.messages;
    if (msgs.length === 0) return;

    stopAudioPlayback();

    let lastUserIdx = -1;
    for (let i = msgs.length - 1; i >= 0; i--) {
      if (msgs[i].role === "user") {
        lastUserIdx = i;
        break;
      }
    }
    if (lastUserIdx === -1) return;

    const baseHistory = msgs.slice(0, lastUserIdx + 1);
    const lastUserMsg = baseHistory[lastUserIdx];
    const effectiveModelTier = overrides?.modelTier ?? activeThread.modelTier;
    const effectiveWebSearchMode =
      overrides?.webSearchMode ?? activeThread.webSearchMode;

    const assistantMsg: ChatMessage = {
      id: generateId(),
      role: "model",
      text: "",
      modelTier: effectiveModelTier,
      createdAt: Date.now(),
    };

    const nextSnapshot: ChatThread = {
      ...activeThread,
      modelTier: effectiveModelTier,
      webSearchMode: effectiveWebSearchMode,
      updatedAt: Date.now(),
      messages: [...baseHistory, assistantMsg],
    };

    isNearBottomRef.current = true;
    updateThread(activeThread.id, () => nextSnapshot);
    requestAnimationFrame(() => scrollToBottom("smooth"));

    await runAssistantTurn(
      nextSnapshot,
      baseHistory,
      assistantMsg.id,
      lastUserMsg.text
    );
  };

  if (!activeThread) {
    return null;
  }

  const t = COPY[language];
  const activeRole = getRoleById(activeThread.roleId);
  const isCurrentThreadStreaming = streamingThreadId === activeThread.id;
  const lastMessage = activeThread.messages[activeThread.messages.length - 1];

  return (
    <MotionConfig reducedMotion="user">
      <div className="nova-ambient-bg flex h-dvh w-full overflow-hidden bg-[#F8FAFC] text-slate-900 dark:bg-[#090F1D] dark:text-slate-100">
        <Sidebar
          threads={threads}
          activeThreadId={activeThread.id}
          language={language}
          theme={theme}
          mobileOpen={mobileSidebarOpen}
          onCloseMobile={() => setMobileSidebarOpen(false)}
          onSelectThread={handleSelectThread}
          onNewThread={handleNewThread}
          onDeleteThread={handleDeleteThread}
          onToggleLanguage={() =>
            setLanguage((prev) => (prev === "ar" ? "en" : "ar"))
          }
          onToggleTheme={() =>
            setTheme((prev) => (prev === "dark" ? "light" : "dark"))
          }
        />

        {/* Main workspace viewport */}
        <div className="relative flex min-w-0 flex-1 flex-col">
          {/* Top Workspace Bar */}
          <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-slate-200/80 bg-white/80 px-3.5 backdrop-blur-sm sm:px-6 dark:border-slate-800/90 dark:bg-[#090F1D]/85">
            <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
              <button
                type="button"
                onClick={() => setMobileSidebarOpen(true)}
                aria-label={t.conversations}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 lg:hidden dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
              >
                <Menu className="h-5 w-5" aria-hidden="true" />
              </button>

              <div className="flex min-w-0 items-center gap-2 text-sm">
                <span className="font-medium text-teal-700 dark:text-teal-400 whitespace-nowrap shrink-0">
                  {activeRole.shortLabel[language]}
                </span>
                <span
                  aria-hidden="true"
                  className="text-slate-300 dark:text-slate-600 shrink-0"
                >
                  /
                </span>
                <span className="truncate font-semibold text-slate-900 dark:text-white">
                  {!activeThread.isAutoTitled &&
                  activeThread.messages.length === 0
                    ? t.untitledThread
                    : activeThread.title || t.untitledThread}
                </span>
                {activeThread.messages.length > 0 ? (
                  <span className="hidden text-xs text-slate-500 sm:inline dark:text-slate-400 whitespace-nowrap shrink-0 tabular-nums">
                    · {t.messagesCount(activeThread.messages.length)}
                  </span>
                ) : null}
                {memory.enabled ? (
                  <span className="hidden text-xs text-teal-700 md:inline dark:text-teal-400 whitespace-nowrap shrink-0">
                    · {t.memoryActiveTag}
                  </span>
                ) : null}
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              {activeThread.messages.length > 0 ? (
                <button
                  type="button"
                  onClick={() => exportThreadToMarkdown(activeThread, language)}
                  aria-label={t.exportMarkdown}
                  title={t.exportMarkdown}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-teal-600 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
                >
                  <Download className="h-4 w-4" aria-hidden="true" />
                </button>
              ) : null}

              <button
                type="button"
                onClick={() => setRoleDrawerOpen(true)}
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-medium text-slate-800 transition-colors hover:border-teal-600/50 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-teal-600 dark:border-slate-700/80 dark:bg-slate-900 dark:text-slate-100 dark:hover:border-teal-500/50 dark:hover:bg-slate-800 whitespace-nowrap shrink-0"
              >
                <SlidersHorizontal
                  className="h-3.5 w-3.5"
                  aria-hidden="true"
                />
                <span>{t.settingsButton}</span>
              </button>
            </div>
          </header>

          {/* Scrollable Thread Viewport */}
          <main
            ref={scrollContainerRef}
            onScroll={handleScroll}
            className="nova-scroll relative flex flex-1 flex-col overflow-y-auto"
          >
            {activeThread.messages.length === 0 ? (
              <EmptyState
                roleId={activeThread.roleId}
                language={language}
                onSelectRole={handleSelectRole}
                onSelectPrompt={(prompt) => handleSendMessage(prompt, [])}
                onOpenRoleDrawer={() => setRoleDrawerOpen(true)}
              />
            ) : (
              <div className="mx-auto w-full max-w-3xl flex-1 space-y-7 px-3.5 py-6 sm:px-6 sm:py-7">
                {activeThread.messages.map((msg) => {
                  const isMsgStreaming =
                    isCurrentThreadStreaming && streamingMessageId === msg.id;
                  const isLatestAssistant =
                    msg.role === "model" && lastMessage?.id === msg.id;

                  return (
                    <MessageItem
                      key={msg.id}
                      message={msg}
                      language={language}
                      roleLabel={activeRole.shortLabel[language]}
                      isStreaming={isMsgStreaming}
                      streamPhase={isMsgStreaming ? streamPhase : "thinking"}
                      canRegenerate={
                        isLatestAssistant && !isCurrentThreadStreaming
                      }
                      audioState={
                        audioMessageId === msg.id ? audioPhase : "idle"
                      }
                      audioError={audioErrorByMsg[msg.id] ?? null}
                      onRegenerate={() => handleRegenerate()}
                      onRegenerateWithoutSearch={() =>
                        handleRegenerate({ webSearchMode: "off" })
                      }
                      onRegenerateWithFastModel={() =>
                        handleRegenerate({
                          modelTier: "fast",
                          webSearchMode: "off",
                        })
                      }
                      onToggleSpeak={handleToggleSpeak}
                      onRequestOpenLink={handleRequestOpenLink}
                      onInspectSafetyReport={handleInspectSafetyReport}
                    />
                  );
                })}
              </div>
            )}
          </main>

          {/* Scroll to bottom affordance */}
          {showScrollBottom ? (
            <div className="pointer-events-none absolute inset-x-0 bottom-[154px] z-20 flex justify-center">
              <button
                type="button"
                onClick={() => {
                  isNearBottomRef.current = true;
                  scrollToBottom("smooth");
                  setShowScrollBottom(false);
                }}
                aria-label={t.scrollToBottom}
                className="pointer-events-auto inline-flex h-9 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3.5 text-xs font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-teal-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{t.scrollToBottom}</span>
              </button>
            </div>
          ) : null}

          {/* Composer */}
          <ChatComposer
            language={language}
            modelTier={activeThread.modelTier}
            webSearchMode={activeThread.webSearchMode}
            isStreaming={isCurrentThreadStreaming}
            onChangeModelTier={handleChangeModelTier}
            onCycleWebSearchMode={handleCycleWebSearchMode}
            onSend={handleSendMessage}
            onStop={stopStreaming}
          />
        </div>

        {/* Persona, Memory & Security Drawer */}
        <RoleDrawer
          open={roleDrawerOpen}
          thread={activeThread}
          language={language}
          memory={memory}
          autoSpeak={autoSpeak}
          onClose={() => setRoleDrawerOpen(false)}
          onSelectRole={handleSelectRole}
          onSelectResponseStyle={handleSelectResponseStyle}
          onUpdateCustomInstruction={handleUpdateCustomInstruction}
          onToggleAutoSpeak={() => setAutoSpeak((prev) => !prev)}
          onToggleMemoryConsent={() =>
            setMemory((prev) => ({ ...prev, enabled: !prev.enabled }))
          }
          onAddMemory={handleAddMemory}
          onDeleteMemory={handleDeleteMemory}
          onClearMemory={handleClearMemory}
          onInspectSafetyReport={handleInspectSafetyReport}
        />

        {/* Safe Link Inspection & Confirmation Modal */}
        <SafeLinkModal
          open={linkModalOpen}
          loading={linkModalLoading}
          pendingUrl={linkModalUrl}
          report={linkModalReport}
          language={language}
          onClose={() => setLinkModalOpen(false)}
        />
      </div>
    </MotionConfig>
  );
}
