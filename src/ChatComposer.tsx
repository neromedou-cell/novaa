import { useEffect, useRef, useState } from "react";
import type { ChangeEvent, KeyboardEvent } from "react";
import {
  ArrowUp,
  FileText,
  Globe,
  Loader2,
  Mic,
  Paperclip,
  Square,
  X,
} from "lucide-react";
import { COPY } from "../data/i18n.ts";
import { MODEL_TIER_META } from "../data/roles.ts";
import { transcribeAudio } from "../services/chatApi.ts";
import type {
  Language,
  MessageAttachment,
  ModelTier,
  WebSearchMode,
} from "../types/chat.ts";
import { formatFileSize, generateId } from "../utils/storage.ts";

interface ChatComposerProps {
  language: Language;
  modelTier: ModelTier;
  webSearchMode: WebSearchMode;
  isStreaming: boolean;
  onChangeModelTier: (tier: ModelTier) => void;
  onCycleWebSearchMode: () => void;
  onSend: (text: string, attachments: MessageAttachment[]) => void;
  onStop: () => void;
}

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const TEXT_EXTENSIONS = [
  ".txt",
  ".md",
  ".markdown",
  ".csv",
  ".json",
  ".js",
  ".jsx",
  ".ts",
  ".tsx",
  ".py",
  ".html",
  ".css",
  ".xml",
  ".yaml",
  ".yml",
  ".sql",
  ".sh",
  ".log",
];

function isTextFile(file: File): boolean {
  if (
    file.type.startsWith("text/") ||
    file.type === "application/json" ||
    file.type === "application/xml" ||
    file.type === "application/javascript"
  ) {
    return true;
  }
  const lower = file.name.toLowerCase();
  return TEXT_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function ChatComposer({
  language,
  modelTier,
  webSearchMode,
  isStreaming,
  onChangeModelTier,
  onCycleWebSearchMode,
  onSend,
  onStop,
}: ChatComposerProps) {
  const [text, setText] = useState("");
  const [attachments, setAttachments] = useState<MessageAttachment[]>([]);
  const [composerError, setComposerError] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const cancelRecordingRef = useRef(false);

  const t = COPY[language];

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 180)}px`;
  }, [text]);

  useEffect(() => {
    if (!isRecording) return;
    const timer = window.setInterval(() => {
      setRecordSeconds((prev) => prev + 1);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [isRecording]);

  useEffect(() => {
    return () => {
      mediaStreamRef.current?.getTracks().forEach((tr) => tr.stop());
    };
  }, []);

  const canSend =
    !isStreaming &&
    !isRecording &&
    !isTranscribing &&
    (text.trim().length > 0 || attachments.length > 0);

  const submitMessage = () => {
    if (!canSend) return;
    onSend(text.trim(), attachments);
    setText("");
    setAttachments([]);
    setComposerError(null);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submitMessage();
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setComposerError(null);

    Array.from(files).forEach((file) => {
      if (file.size > MAX_FILE_BYTES) {
        setComposerError(t.attachmentLimitError);
        return;
      }

      const isImage = file.type.startsWith("image/");
      const isPdf =
        file.type === "application/pdf" ||
        file.name.toLowerCase().endsWith(".pdf");
      const isText = !isImage && !isPdf && isTextFile(file);

      if (!isImage && !isPdf && !isText) {
        setComposerError(t.attachmentUnsupportedError);
        return;
      }

      if (isText) {
        const reader = new FileReader();
        reader.onload = () => {
          const content =
            typeof reader.result === "string" ? reader.result : "";
          setAttachments((prev) => [
            ...prev.slice(0, 3),
            {
              id: generateId(),
              kind: "text",
              name: file.name,
              mimeType: file.type || "text/plain",
              size: file.size,
              textContent: content,
            },
          ]);
        };
        reader.readAsText(file);
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const result = typeof reader.result === "string" ? reader.result : "";
        const commaIdx = result.indexOf(",");
        if (commaIdx === -1) return;
        const base64Data = result.slice(commaIdx + 1);
        setAttachments((prev) => [
          ...prev.slice(0, 3),
          {
            id: generateId(),
            kind: isPdf ? "pdf" : "image",
            name: file.name,
            mimeType: isPdf ? "application/pdf" : file.type,
            size: file.size,
            data: base64Data,
            previewUrl: isImage ? result : undefined,
          },
        ]);
      };
      reader.readAsDataURL(file);
    });

    e.target.value = "";
  };

  const removeAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((item) => item.id !== id));
  };

  const cleanupStream = () => {
    mediaStreamRef.current?.getTracks().forEach((tr) => tr.stop());
    mediaStreamRef.current = null;
    mediaRecorderRef.current = null;
  };

  const startRecording = async () => {
    setComposerError(null);
    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices?.getUserMedia ||
      typeof MediaRecorder === "undefined"
    ) {
      setComposerError(t.voiceUnsupportedError);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      audioChunksRef.current = [];
      cancelRecordingRef.current = false;

      const preferredMime = MediaRecorder.isTypeSupported(
        "audio/webm;codecs=opus"
      )
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
          ? "audio/webm"
          : MediaRecorder.isTypeSupported("audio/mp4")
            ? "audio/mp4"
            : "";

      const recorder = preferredMime
        ? new MediaRecorder(stream, { mimeType: preferredMime })
        : new MediaRecorder(stream);

      recorder.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) {
          audioChunksRef.current.push(ev.data);
        }
      };

      recorder.onstop = async () => {
        const wasCanceled = cancelRecordingRef.current;
        const mimeType = recorder.mimeType || "audio/webm";
        const chunks = audioChunksRef.current;
        cleanupStream();
        setIsRecording(false);
        setRecordSeconds(0);

        if (wasCanceled || chunks.length === 0) {
          return;
        }

        const blob = new Blob(chunks, { type: mimeType });
        setIsTranscribing(true);
        try {
          const base64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
              const str =
                typeof reader.result === "string" ? reader.result : "";
              const idx = str.indexOf(",");
              resolve(idx === -1 ? "" : str.slice(idx + 1));
            };
            reader.onerror = () =>
              reject(new Error("Failed to read recording"));
            reader.readAsDataURL(blob);
          });

          if (!base64) {
            throw new Error(t.networkError);
          }

          const transcript = await transcribeAudio({
            audioBase64: base64,
            mimeType,
            language,
          });

          if (transcript) {
            setText((prev) =>
              prev.trim().length > 0
                ? `${prev.trim()} ${transcript}`
                : transcript
            );
            requestAnimationFrame(() => textareaRef.current?.focus());
          }
        } catch (err) {
          setComposerError(
            err instanceof Error ? err.message : t.networkError
          );
        } finally {
          setIsTranscribing(false);
        }
      };

      mediaRecorderRef.current = recorder;
      setRecordSeconds(0);
      setIsRecording(true);
      recorder.start();
    } catch {
      cleanupStream();
      setIsRecording(false);
      setComposerError(t.voicePermissionError);
    }
  };

  const stopRecordingAndTranscribe = () => {
    cancelRecordingRef.current = false;
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      mediaRecorderRef.current.stop();
    }
  };

  const cancelRecording = () => {
    cancelRecordingRef.current = true;
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      mediaRecorderRef.current.stop();
    } else {
      cleanupStream();
      setIsRecording(false);
      setRecordSeconds(0);
    }
  };

  const tiers: ModelTier[] = ["fast", "balanced", "deep"];

  const searchLabel =
    webSearchMode === "on"
      ? t.webSearchOn
      : webSearchMode === "auto"
        ? t.webSearchAuto
        : t.webSearchOff;

  const searchHint =
    webSearchMode === "on"
      ? t.webSearchOnHint
      : webSearchMode === "auto"
        ? t.webSearchAutoHint
        : t.webSearchOffHint;

  const searchButtonTone =
    webSearchMode === "on"
      ? "border-teal-600/70 bg-teal-50 text-teal-800 dark:border-teal-500/70 dark:bg-teal-950/60 dark:text-teal-300"
      : webSearchMode === "auto"
        ? "border-sky-600/35 bg-sky-50/75 text-sky-800 dark:border-sky-500/40 dark:bg-sky-950/40 dark:text-sky-300"
        : "border-transparent bg-slate-100 text-slate-600 hover:text-slate-900 dark:bg-slate-800/90 dark:text-slate-400 dark:hover:text-slate-100";

  return (
    <div className="shrink-0 border-t border-slate-200/80 bg-white/90 px-3 pt-3 pb-3.5 backdrop-blur-sm sm:px-6 sm:pb-4 dark:border-slate-800 dark:bg-[#0B1120]/90">
      <div className="mx-auto w-full max-w-3xl">
        {composerError ? (
          <p
            role="alert"
            className="mb-2 text-xs font-medium text-rose-600 dark:text-rose-400"
          >
            {composerError}
          </p>
        ) : null}

        <div className="rounded-2xl border border-slate-200/95 bg-white shadow-xs transition-all duration-150 focus-within:border-teal-600/80 focus-within:ring-2 focus-within:ring-teal-600/12 dark:border-slate-800 dark:bg-slate-900/95 dark:focus-within:border-teal-500/80 dark:focus-within:ring-teal-500/15">
          {/* Attachment preview tray */}
          {attachments.length > 0 ? (
            <div className="flex flex-wrap gap-2 border-b border-slate-100 px-3.5 py-2.5 dark:border-slate-800">
              {attachments.map((att) =>
                att.kind === "image" && att.previewUrl ? (
                  <div
                    key={att.id}
                    className="relative overflow-hidden rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800"
                  >
                    <img
                      src={att.previewUrl}
                      alt={att.name}
                      referrerPolicy="no-referrer"
                      className="h-16 w-16 object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removeAttachment(att.id)}
                      aria-label={t.removeAttachment}
                      className="absolute end-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-slate-900/80 text-white transition-colors hover:bg-slate-900"
                    >
                      <X className="h-3 w-3" aria-hidden="true" />
                    </button>
                  </div>
                ) : (
                  <div
                    key={att.id}
                    className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 py-1.5 ps-2.5 pe-1.5 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  >
                    <FileText
                      className="h-4 w-4 shrink-0 text-teal-700 dark:text-teal-400"
                      aria-hidden="true"
                    />
                    <div className="min-w-0">
                      <div className="max-w-[150px] truncate font-medium">
                        {att.name}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
                        {att.kind === "pdf" ? t.pdfBadge : t.textFileBadge} ·{" "}
                        {formatFileSize(att.size, language)}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeAttachment(att.id)}
                      aria-label={t.removeAttachment}
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-900 dark:hover:bg-slate-700 dark:hover:text-white"
                    >
                      <X className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </div>
                )
              )}
            </div>
          ) : null}

          {/* Voice recording / transcribing bar OR message textarea */}
          {isRecording ? (
            <div className="flex items-center justify-between gap-3 px-4 py-3.5">
              <div className="flex items-center gap-2.5 text-sm font-medium text-rose-700 dark:text-rose-400">
                <Mic className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="font-mono tabular-nums">
                  {formatDuration(recordSeconds)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={cancelRecording}
                  className="inline-flex h-9 items-center rounded-lg px-3 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white whitespace-nowrap shrink-0"
                >
                  {t.voiceCancel}
                </button>
                <button
                  type="button"
                  onClick={stopRecordingAndTranscribe}
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-teal-700 px-3.5 text-xs font-medium text-white transition-colors hover:bg-teal-800 dark:bg-teal-600 dark:hover:bg-teal-500 whitespace-nowrap shrink-0"
                >
                  <Square className="h-3 w-3 fill-current" aria-hidden="true" />
                  <span>{t.voiceRecordStop}</span>
                </button>
              </div>
            </div>
          ) : isTranscribing ? (
            <div className="flex items-center gap-2.5 px-4 py-4 text-sm text-slate-600 dark:text-slate-300">
              <Loader2
                className="h-4 w-4 shrink-0 animate-spin text-teal-700 dark:text-teal-400"
                aria-hidden="true"
              />
              <span>{t.voiceTranscribing}</span>
            </div>
          ) : (
            <textarea
              ref={textareaRef}
              rows={1}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t.composerPlaceholder}
              aria-label={t.composerPlaceholder}
              className="nova-scroll block max-h-[180px] w-full resize-none bg-transparent px-4 pt-3.5 pb-2 text-[15.5px] leading-relaxed text-slate-900 placeholder:text-slate-400 focus:outline-none dark:text-slate-100 dark:placeholder:text-slate-500"
            />
          )}

          {/* Composer toolbar (Android-friendly touch sizes & responsive wrapping) */}
          <div className="flex flex-wrap items-center justify-between gap-2 px-2.5 pb-2.5 pt-1 sm:px-3">
            <div className="flex flex-wrap items-center gap-1.5">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,application/pdf,.txt,.md,.csv,.json,.js,.jsx,.ts,.tsx,.py,.html,.css,.xml,.yaml,.yml,.sql,.log"
                multiple
                onChange={handleFileChange}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                aria-label={t.attachFiles}
                title={t.attachFiles}
                disabled={isStreaming || isRecording || isTranscribing}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 disabled:opacity-45 focus-visible:outline-2 focus-visible:outline-teal-600 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
              >
                <Paperclip className="h-4 w-4" aria-hidden="true" />
              </button>

              <button
                type="button"
                onClick={
                  isRecording ? stopRecordingAndTranscribe : startRecording
                }
                aria-label={
                  isRecording ? t.voiceRecordStop : t.voiceRecordStart
                }
                title={isRecording ? t.voiceRecordStop : t.voiceRecordStart}
                disabled={isStreaming || isTranscribing}
                className={`inline-flex h-10 w-10 items-center justify-center rounded-xl transition-colors disabled:opacity-45 focus-visible:outline-2 focus-visible:outline-teal-600 ${
                  isRecording
                    ? "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400"
                    : "text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                }`}
              >
                <Mic className="h-4 w-4" aria-hidden="true" />
              </button>

              {/* Smart Web Search Mode button (Auto -> On -> Off) */}
              <button
                type="button"
                onClick={onCycleWebSearchMode}
                title={searchHint}
                disabled={isStreaming}
                className={`inline-flex h-10 items-center gap-1.5 rounded-xl border px-3 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-teal-600 whitespace-nowrap shrink-0 ${searchButtonTone}`}
              >
                <Globe className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{searchLabel}</span>
              </button>

              {/* 3-Tier Model selector: Fast / Balanced / Stronger */}
              <div
                role="group"
                aria-label="Model tier"
                className="inline-flex h-10 items-center rounded-xl bg-slate-100 p-1 dark:bg-slate-800/90"
              >
                {tiers.map((tier) => {
                  const meta = MODEL_TIER_META[tier];
                  const active = modelTier === tier;
                  return (
                    <button
                      key={tier}
                      type="button"
                      title={meta.description[language]}
                      onClick={() => onChangeModelTier(tier)}
                      className={`h-8 rounded-lg px-2.5 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-teal-600 whitespace-nowrap shrink-0 ${
                        active
                          ? "bg-white text-slate-900 shadow-xs dark:bg-slate-950 dark:text-white"
                          : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
                      }`}
                    >
                      {meta.label[language]}
                    </button>
                  );
                })}
              </div>
            </div>

            {isStreaming ? (
              <button
                type="button"
                onClick={onStop}
                className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-slate-900 px-4 text-xs font-medium text-white transition-colors hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-white whitespace-nowrap shrink-0"
              >
                <Square className="h-3 w-3 fill-current" aria-hidden="true" />
                <span>{t.stop}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={submitMessage}
                disabled={!canSend}
                aria-label={t.send}
                className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-gradient-to-r from-teal-700 via-cyan-700 to-sky-700 px-4 text-xs font-medium text-white shadow-xs transition-all duration-150 hover:from-teal-800 hover:to-sky-800 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:bg-none disabled:text-slate-400 disabled:shadow-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 dark:from-teal-600 dark:via-cyan-600 dark:to-sky-600 dark:hover:from-teal-500 dark:hover:to-sky-500 dark:disabled:bg-slate-800 dark:disabled:text-slate-500 whitespace-nowrap shrink-0"
              >
                <span>{t.send}</span>
                <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            )}
          </div>
        </div>

        <div className="mt-2 flex items-center justify-between gap-3 px-1 text-[11.5px] text-slate-500 dark:text-slate-400">
          <span className="truncate">{searchHint}</span>
          <span className="hidden font-mono sm:inline whitespace-nowrap shrink-0">
            {MODEL_TIER_META[modelTier].modelLabel}
          </span>
        </div>
      </div>
    </div>
  );
}
