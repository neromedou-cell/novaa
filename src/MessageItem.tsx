import { useState } from "react";
import { motion } from "motion/react";
import {
  AlertCircle,
  Check,
  Copy,
  ExternalLink,
  FileText,
  Globe,
  Info,
  Loader2,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  ShieldX,
  Square,
  Volume2,
  Zap,
} from "lucide-react";
import { COPY } from "../data/i18n.ts";
import { MODEL_TIER_META } from "../data/roles.ts";
import type {
  ChatMessage,
  Language,
  LinkSafetyReport,
  WebSource,
} from "../types/chat.ts";
import { formatFileSize, formatTime } from "../utils/storage.ts";
import { MarkdownContent } from "./MarkdownContent.tsx";
import { NovaLogo } from "./NovaLogo.tsx";

interface MessageItemProps {
  message: ChatMessage;
  language: Language;
  roleLabel: string;
  isStreaming: boolean;
  streamPhase?: "thinking" | "searching" | "verifying_links";
  canRegenerate: boolean;
  audioState: "idle" | "loading" | "playing";
  audioError?: string | null;
  onRegenerate: () => void;
  onRegenerateWithoutSearch?: () => void;
  onRegenerateWithFastModel?: () => void;
  onToggleSpeak: (messageId: string, text: string) => void;
  onRequestOpenLink: (href: string, existingReport?: LinkSafetyReport) => void;
  onInspectSafetyReport: (report: LinkSafetyReport) => void;
}

function getHostname(uri: string): string {
  try {
    return new URL(uri).hostname.replace(/^www\./, "");
  } catch {
    return uri;
  }
}

function renderSafetyIcon(source: WebSource) {
  const verdict = source.safety?.verdict ?? "caution";
  if (verdict === "danger") {
    return (
      <ShieldX
        className="h-3.5 w-3.5 shrink-0 text-rose-600 dark:text-rose-400"
        aria-hidden="true"
      />
    );
  }
  if (verdict === "caution") {
    return (
      <ShieldAlert
        className="h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400"
        aria-hidden="true"
      />
    );
  }
  return (
    <ShieldCheck
      className="h-3.5 w-3.5 shrink-0 text-teal-700 dark:text-teal-400"
      aria-hidden="true"
    />
  );
}

export function MessageItem({
  message,
  language,
  roleLabel,
  isStreaming,
  streamPhase = "thinking",
  canRegenerate,
  audioState,
  audioError,
  onRegenerate,
  onRegenerateWithoutSearch,
  onRegenerateWithFastModel,
  onToggleSpeak,
  onRequestOpenLink,
  onInspectSafetyReport,
}: MessageItemProps) {
  const [copied, setCopied] = useState(false);
  const t = COPY[language];

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard unavailable
    }
  };

  if (message.role === "user") {
    const imageAtts =
      message.attachments?.filter((a) => a.kind === "image" && a.previewUrl) ??
      [];
    const docAtts =
      message.attachments?.filter((a) => a.kind !== "image") ?? [];

    return (
      <motion.article
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className="flex flex-col items-end"
      >
        <div className="max-w-[88%] rounded-2xl border border-teal-700/15 bg-gradient-to-br from-slate-100 via-slate-100 to-teal-50/60 px-4 py-3 text-slate-900 shadow-xs sm:max-w-[74%] dark:border-teal-500/20 dark:from-slate-800/90 dark:via-slate-800/85 dark:to-teal-950/40 dark:text-slate-100">
          {imageAtts.length > 0 ? (
            <div className="mb-2.5 flex flex-wrap gap-2">
              {imageAtts.map((att) => (
                <figure
                  key={att.id}
                  className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900"
                >
                  <img
                    src={att.previewUrl}
                    alt={att.name}
                    referrerPolicy="no-referrer"
                    className="max-h-52 max-w-64 object-cover"
                  />
                </figure>
              ))}
            </div>
          ) : null}

          {docAtts.length > 0 ? (
            <div className="mb-2.5 flex flex-wrap gap-2">
              {docAtts.map((att) => (
                <div
                  key={att.id}
                  className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                >
                  <FileText
                    className="h-4 w-4 shrink-0 text-teal-700 dark:text-teal-400"
                    aria-hidden="true"
                  />
                  <div className="min-w-0">
                    <div className="max-w-[200px] truncate font-medium">
                      {att.name}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
                      {att.kind === "pdf" ? t.pdfBadge : t.textFileBadge} ·{" "}
                      {formatFileSize(att.size, language)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          {message.text ? (
            <p className="whitespace-pre-wrap text-[15.5px] leading-[1.68]">
              {message.text}
            </p>
          ) : null}
        </div>
        <div className="mt-1.5 flex items-center gap-1.5 px-1 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
          <span>{t.youLabel}</span>
          <span aria-hidden="true">·</span>
          <span>{formatTime(message.createdAt, language)}</span>
        </div>
      </motion.article>
    );
  }

  const tierLabel = message.modelTier
    ? MODEL_TIER_META[message.modelTier].label[language]
    : null;

  const statusText =
    streamPhase === "searching"
      ? t.searchingMessage
      : streamPhase === "verifying_links"
        ? t.verifyingLinksMessage
        : t.thinkingMessage;

  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
      className="group flex items-start gap-3 sm:gap-3.5"
    >
      <div className="mt-0.5">
        <NovaLogo size="sm" variant="outline" />
      </div>

      <div className="min-w-0 flex-1 max-w-[72ch]">
        {/* Quiet unboxed metadata line */}
        <div className="mb-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
          <span
            dir="ltr"
            className="font-semibold text-slate-900 dark:text-slate-100"
          >
            {t.assistantLabel}
          </span>
          <span aria-hidden="true">·</span>
          <span>{roleLabel}</span>
          <span aria-hidden="true">·</span>
          <span>{formatTime(message.createdAt, language)}</span>
          {tierLabel ? (
            <>
              <span aria-hidden="true">·</span>
              <span>{tierLabel}</span>
            </>
          ) : null}
          {message.webSearchUsed ? (
            <>
              <span aria-hidden="true">·</span>
              <span className="inline-flex items-center gap-1 text-teal-700 dark:text-teal-400">
                <Globe className="h-3 w-3" aria-hidden="true" />
                <span>
                  {message.autoSearchTriggered
                    ? t.webSearchAutoUsedBadge
                    : t.webSearchUsedBadge}
                </span>
              </span>
            </>
          ) : null}
        </div>

        {/* Subtle transparent notice (e.g., quota fallback) */}
        {message.notice && !message.error ? (
          <div
            role="status"
            className="mb-2.5 flex items-start gap-2 rounded-xl border border-amber-200/90 bg-amber-50/80 px-3 py-2 text-xs leading-relaxed text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/35 dark:text-amber-200"
          >
            <Info
              className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400"
              aria-hidden="true"
            />
            <span className="min-w-0 flex-1">{message.notice}</span>
          </div>
        ) : null}

        {/* Message content, animated thinking state, or error */}
        {message.error ? (
          <div
            role="alert"
            className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50/85 px-4 py-3 text-sm text-rose-800 dark:border-rose-900/70 dark:bg-rose-950/40 dark:text-rose-200"
          >
            <AlertCircle
              className="mt-0.5 h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400"
              aria-hidden="true"
            />
            <div className="min-w-0 flex-1 leading-relaxed">{message.error}</div>
          </div>
        ) : message.text.length === 0 && isStreaming ? (
          <div className="flex items-center gap-3 py-1.5 text-sm text-slate-600 dark:text-slate-300">
            <span className="inline-flex items-center gap-1" aria-hidden="true">
              <span className="nova-wave-bar bg-teal-600 dark:bg-teal-400" />
              <span className="nova-wave-bar bg-cyan-600 dark:bg-cyan-400" />
              <span className="nova-wave-bar bg-sky-600 dark:bg-sky-400" />
            </span>
            <span>{statusText}</span>
          </div>
        ) : (
          <MarkdownContent
            content={message.text}
            language={language}
            isStreaming={isStreaming}
            onRequestOpenLink={(href) => onRequestOpenLink(href)}
          />
        )}

        {/* Inline link verification note right after text streams */}
        {isStreaming &&
        message.text.length > 0 &&
        streamPhase === "verifying_links" ? (
          <div className="mt-3 flex items-center gap-2 text-xs text-teal-700 dark:text-teal-400">
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            <span>{t.verifyingLinksMessage}</span>
          </div>
        ) : null}

        {/* Verified Web Search Sources with real Shield safety status */}
        {message.sources && message.sources.length > 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="mt-4 border-t border-slate-200/80 pt-3.5 dark:border-slate-800"
          >
            <div className="mb-2.5 flex items-center justify-between gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
              <span>{t.sourcesHeading}</span>
              <span className="font-normal text-slate-500 dark:text-slate-400 tabular-nums">
                {message.sources.length}
              </span>
            </div>
            <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {message.sources.slice(0, 8).map((source, idx) => {
                const targetUrl = source.resolvedUri || source.uri;
                const displayHost = source.hostname || getHostname(targetUrl);
                const verdict = source.safety?.verdict ?? "caution";
                const verdictLabel =
                  verdict === "danger"
                    ? t.verdictDanger
                    : verdict === "caution"
                      ? t.verdictCaution
                      : t.verdictSafe;

                const borderTone =
                  verdict === "danger"
                    ? "border-rose-200/90 hover:border-rose-400 dark:border-rose-900/70 dark:hover:border-rose-700"
                    : verdict === "caution"
                      ? "border-amber-200/90 hover:border-amber-400 dark:border-amber-900/70 dark:hover:border-amber-700"
                      : "border-slate-200/90 hover:border-teal-600/60 dark:border-slate-800 dark:hover:border-teal-500/60";

                const verdictTextTone =
                  verdict === "danger"
                    ? "text-rose-700 dark:text-rose-400"
                    : verdict === "caution"
                      ? "text-amber-700 dark:text-amber-400"
                      : "text-teal-700 dark:text-teal-400";

                return (
                  <li
                    key={source.uri}
                    className={`flex items-stretch justify-between gap-1.5 rounded-xl border bg-white/95 transition-colors dark:bg-slate-900/80 ${borderTone}`}
                  >
                    {verdict === "safe" && source.safety?.allowOpen ? (
                      <a
                        href={targetUrl}
                        target="_blank"
                        rel="noopener noreferrer nofollow"
                        className="flex min-w-0 flex-1 items-center justify-between gap-2 px-3 py-2.5 text-xs focus-visible:outline-2 focus-visible:outline-teal-600"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="truncate font-medium text-slate-900 dark:text-slate-100">
                            <span className="me-1.5 font-mono text-[11px] text-slate-400 tabular-nums">
                              {idx + 1}.
                            </span>
                            {source.title}
                          </div>
                          <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                            <span dir="ltr" className="truncate font-mono">
                              {displayHost}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span className={`shrink-0 font-medium ${verdictTextTone}`}>
                              {verdictLabel}
                            </span>
                          </div>
                        </div>
                        <ExternalLink
                          className="h-3.5 w-3.5 shrink-0 text-slate-400"
                          aria-hidden="true"
                        />
                      </a>
                    ) : (
                      <button
                        type="button"
                        onClick={() =>
                          onRequestOpenLink(targetUrl, source.safety)
                        }
                        className="flex min-w-0 flex-1 items-center justify-between gap-2 px-3 py-2.5 text-start text-xs focus-visible:outline-2 focus-visible:outline-teal-600"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="truncate font-medium text-slate-900 dark:text-slate-100">
                            <span className="me-1.5 font-mono text-[11px] text-slate-400 tabular-nums">
                              {idx + 1}.
                            </span>
                            {source.title}
                          </div>
                          <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                            <span dir="ltr" className="truncate font-mono">
                              {displayHost}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span className={`shrink-0 font-medium ${verdictTextTone}`}>
                              {verdictLabel}
                            </span>
                          </div>
                        </div>
                        <ExternalLink
                          className="h-3.5 w-3.5 shrink-0 text-slate-400"
                          aria-hidden="true"
                        />
                      </button>
                    )}

                    {source.safety ? (
                      <button
                        type="button"
                        onClick={() => onInspectSafetyReport(source.safety!)}
                        aria-label={t.inspectLinkReport}
                        title={t.inspectLinkReport}
                        className="flex w-9 shrink-0 items-center justify-center border-s border-slate-200/70 transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-teal-600 dark:border-slate-800 dark:hover:bg-slate-800/70"
                      >
                        {renderSafetyIcon(source)}
                      </button>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </motion.div>
        ) : null}

        {/* Audio error notice */}
        {audioError ? (
          <p
            role="alert"
            className="mt-2 text-xs text-rose-600 dark:text-rose-400"
          >
            {audioError}
          </p>
        ) : null}

        {/* Action row when not streaming */}
        {!isStreaming && (message.text.length > 0 || message.error) ? (
          <div className="mt-2.5 flex flex-wrap items-center gap-1">
            {message.text.length > 0 ? (
              <>
                <button
                  type="button"
                  onClick={() => onToggleSpeak(message.id, message.text)}
                  disabled={audioState === "loading"}
                  className={`inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-teal-600 whitespace-nowrap shrink-0 ${
                    audioState === "playing"
                      ? "bg-teal-50 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300"
                      : "text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                  }`}
                >
                  {audioState === "loading" ? (
                    <>
                      <Loader2
                        className="h-3.5 w-3.5 animate-spin"
                        aria-hidden="true"
                      />
                      <span>{t.loadingAudio}</span>
                    </>
                  ) : audioState === "playing" ? (
                    <>
                      <Square
                        className="h-3 w-3 fill-current"
                        aria-hidden="true"
                      />
                      <span>{t.stopAudio}</span>
                    </>
                  ) : (
                    <>
                      <Volume2 className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>{t.listen}</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleCopy}
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-teal-600 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100 whitespace-nowrap shrink-0"
                >
                  {copied ? (
                    <>
                      <Check
                        className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400"
                        aria-hidden="true"
                      />
                      <span>{t.copied}</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>{t.copy}</span>
                    </>
                  )}
                </button>
              </>
            ) : null}

            {canRegenerate ? (
              <>
                <button
                  type="button"
                  onClick={onRegenerate}
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-teal-600 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100 whitespace-nowrap shrink-0"
                >
                  <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>{t.regenerate}</span>
                </button>

                {message.error &&
                message.errorCode === "SEARCH_QUOTA_EXCEEDED" &&
                onRegenerateWithoutSearch ? (
                  <button
                    type="button"
                    onClick={onRegenerateWithoutSearch}
                    className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-teal-600/30 bg-teal-50 px-3 text-xs font-medium text-teal-800 transition-colors hover:bg-teal-100 focus-visible:outline-2 focus-visible:outline-teal-600 dark:border-teal-500/40 dark:bg-teal-950/60 dark:text-teal-300 dark:hover:bg-teal-900/60 whitespace-nowrap shrink-0"
                  >
                    <Zap className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>{t.replyWithoutSearch}</span>
                  </button>
                ) : null}

                {message.error &&
                message.errorCode === "QUOTA_EXCEEDED" &&
                message.modelTier !== "fast" &&
                onRegenerateWithFastModel ? (
                  <button
                    type="button"
                    onClick={onRegenerateWithFastModel}
                    className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-teal-600/30 bg-teal-50 px-3 text-xs font-medium text-teal-800 transition-colors hover:bg-teal-100 focus-visible:outline-2 focus-visible:outline-teal-600 dark:border-teal-500/40 dark:bg-teal-950/60 dark:text-teal-300 dark:hover:bg-teal-900/60 whitespace-nowrap shrink-0"
                  >
                    <Zap className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>{t.retryWithFastModel}</span>
                  </button>
                ) : null}
              </>
            ) : null}
          </div>
        ) : null}
      </div>
    </motion.article>
  );
}
