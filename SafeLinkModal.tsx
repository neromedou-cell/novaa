import { AnimatePresence, motion } from "motion/react";
import {
  AlertTriangle,
  ExternalLink,
  Loader2,
  ShieldAlert,
  ShieldCheck,
  ShieldX,
  X,
} from "lucide-react";
import { COPY } from "../data/i18n.ts";
import type { Language, LinkSafetyReport } from "../types/chat.ts";

interface SafeLinkModalProps {
  open: boolean;
  loading: boolean;
  pendingUrl: string | null;
  report: LinkSafetyReport | null;
  language: Language;
  onClose: () => void;
}

export function SafeLinkModal({
  open,
  loading,
  pendingUrl,
  report,
  language,
  onClose,
}: SafeLinkModalProps) {
  const t = COPY[language];

  const verdict = report?.verdict ?? "caution";
  const isBlocked = report ? !report.allowOpen : false;

  const headerTitle = loading
    ? t.securityChecking
    : isBlocked
      ? t.safeModalTitleBlocked
      : verdict === "danger"
        ? t.safeModalTitleDanger
        : verdict === "caution"
          ? t.safeModalTitleCaution
          : verdict === "unavailable"
            ? t.safeModalTitleUnavailable
            : t.safeModalTitleSafe;

  const VerdictIcon =
    isBlocked || verdict === "danger"
      ? ShieldX
      : verdict === "caution" || verdict === "unavailable"
        ? ShieldAlert
        : ShieldCheck;

  const verdictTone =
    isBlocked || verdict === "danger"
      ? "border-rose-200 bg-rose-50/80 text-rose-800 dark:border-rose-900/70 dark:bg-rose-950/40 dark:text-rose-200"
      : verdict === "caution" || verdict === "unavailable"
        ? "border-amber-200 bg-amber-50/80 text-amber-900 dark:border-amber-900/70 dark:bg-amber-950/40 dark:text-amber-200"
        : "border-teal-200 bg-teal-50/75 text-teal-900 dark:border-teal-900/70 dark:bg-teal-950/40 dark:text-teal-200";

  const iconTone =
    isBlocked || verdict === "danger"
      ? "text-rose-600 dark:text-rose-400"
      : verdict === "caution" || verdict === "unavailable"
        ? "text-amber-600 dark:text-amber-400"
        : "text-teal-700 dark:text-teal-400";

  return (
    <AnimatePresence>
      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label={headerTitle}
        >
          <motion.button
            type="button"
            aria-label={t.closePanel}
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16 }}
            className="fixed inset-0 bg-slate-950/55 backdrop-blur-[2px]"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-[#0F172A]"
          >
            {/* Header */}
            <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-4 dark:border-slate-800">
              <div className="flex min-w-0 items-center gap-2.5">
                {loading ? (
                  <Loader2
                    className="h-5 w-5 shrink-0 animate-spin text-teal-700 dark:text-teal-400"
                    aria-hidden="true"
                  />
                ) : (
                  <VerdictIcon
                    className={`h-5 w-5 shrink-0 ${iconTone}`}
                    aria-hidden="true"
                  />
                )}
                <h2 className="truncate font-display text-base font-semibold text-slate-900 dark:text-white">
                  {headerTitle}
                </h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label={t.closePanel}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            {/* Body */}
            <div className="space-y-4 px-5 py-5">
              {loading ? (
                <div className="space-y-3 py-4">
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    {t.securityChecking}
                  </p>
                  {pendingUrl ? (
                    <div
                      dir="ltr"
                      className="break-all rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 font-mono text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400"
                    >
                      {pendingUrl}
                    </div>
                  ) : null}
                </div>
              ) : report ? (
                <>
                  {/* Destination box */}
                  <div>
                    <div className="mb-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
                      {t.safeModalDestination}
                    </div>
                    <div
                      dir="ltr"
                      className="break-all rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 font-mono text-xs text-slate-800 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
                    >
                      {report.resolvedUrl}
                    </div>
                  </div>

                  {/* Verdict findings */}
                  <div className={`rounded-xl border px-4 py-3.5 ${verdictTone}`}>
                    <div className="mb-2 flex items-center justify-between gap-2 text-xs font-semibold">
                      <span>{t.safeModalReasons}</span>
                      <span>
                        {verdict === "danger"
                          ? t.verdictDanger
                          : verdict === "caution"
                            ? t.verdictCaution
                            : verdict === "unavailable"
                              ? t.verdictUnavailable
                              : t.verdictSafe}
                      </span>
                    </div>
                    <ul className="space-y-1.5 text-xs leading-relaxed">
                      {report.reasons[language].map((reason, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span aria-hidden="true">•</span>
                          <span>{reason}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Download guard alert */}
                  {report.isDownloadRisk ? (
                    <div className="flex items-start gap-2.5 rounded-lg border border-amber-200/90 bg-amber-50/70 px-3.5 py-2.5 text-xs text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/35 dark:text-amber-200">
                      <AlertTriangle
                        className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400"
                        aria-hidden="true"
                      />
                      <span>{t.safeModalDownloadWarning}</span>
                    </div>
                  ) : null}

                  {/* Providers checked (clean unboxed metadata) */}
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      {t.safeModalProviders}:{" "}
                    </span>
                    <span>{report.checkedProviders.join(" · ")}</span>
                  </div>

                  {isBlocked ? (
                    <p className="text-xs font-medium text-rose-700 dark:text-rose-400">
                      {t.safeModalBlockedNotice}
                    </p>
                  ) : null}
                </>
              ) : null}
            </div>

            {/* Footer actions */}
            <div className="flex flex-wrap items-center justify-end gap-2.5 border-t border-slate-200 bg-slate-50/70 px-5 py-3.5 dark:border-slate-800 dark:bg-slate-900/60">
              <button
                type="button"
                onClick={onClose}
                className="inline-flex h-10 items-center rounded-lg border border-slate-200 bg-white px-4 text-xs font-medium text-slate-800 transition-colors hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-teal-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700 whitespace-nowrap shrink-0"
              >
                {t.safeModalCancel}
              </button>

              {!loading && report && report.allowOpen ? (
                <a
                  href={report.resolvedUrl}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  onClick={onClose}
                  className={`inline-flex h-10 items-center gap-1.5 rounded-lg px-4 text-xs font-medium text-white transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 whitespace-nowrap shrink-0 ${
                    verdict === "danger"
                      ? "bg-rose-700 hover:bg-rose-800 focus-visible:outline-rose-600"
                      : verdict === "caution"
                        ? "bg-amber-700 hover:bg-amber-800 focus-visible:outline-amber-600"
                        : "bg-gradient-to-r from-teal-700 to-sky-700 hover:from-teal-800 hover:to-sky-800 focus-visible:outline-teal-600"
                  }`}
                >
                  <span>
                    {verdict === "safe" || verdict === "unavailable"
                      ? t.safeModalOpenSafe
                      : t.safeModalProceedRisk}
                  </span>
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                </a>
              ) : null}
            </div>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );
}
