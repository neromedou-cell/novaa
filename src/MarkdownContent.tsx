import { useState } from "react";
import type { MouseEvent } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Check, Copy, Shield } from "lucide-react";
import { COPY } from "../data/i18n.ts";
import type { Language } from "../types/chat.ts";

interface MarkdownContentProps {
  content: string;
  language: Language;
  isStreaming?: boolean;
  onRequestOpenLink?: (href: string) => void;
}

function CodeBlock({
  code,
  codeLang,
  language,
}: {
  code: string;
  codeLang: string;
  language: Language;
}) {
  const [copied, setCopied] = useState(false);
  const t = COPY[language];

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard unavailable
    }
  };

  return (
    <div
      dir="ltr"
      className="my-4 overflow-hidden rounded-xl border border-slate-200 bg-slate-950 text-slate-100 shadow-xs dark:border-slate-800"
    >
      <div className="flex items-center justify-between border-b border-slate-800/90 bg-slate-900/95 px-4 py-2 text-xs text-slate-400">
        <span className="font-mono lowercase">{codeLang || "code"}</span>
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-slate-300 transition-colors hover:bg-slate-800 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-500 whitespace-nowrap shrink-0"
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5 text-teal-400" aria-hidden="true" />
              <span>{t.copied}</span>
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{t.copy}</span>
            </>
          )}
        </button>
      </div>
      <pre className="nova-scroll overflow-x-auto p-4 text-[13.5px] leading-relaxed font-mono text-slate-100">
        <code>{code}</code>
      </pre>
    </div>
  );
}

export function MarkdownContent({
  content,
  language,
  isStreaming = false,
  onRequestOpenLink,
}: MarkdownContentProps) {
  return (
    <div className="nova-prose text-[15.5px] leading-[1.72] text-slate-800 dark:text-slate-100 break-words">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="mt-5 mb-2.5 text-xl font-semibold tracking-tight text-slate-900 dark:text-white first:mt-0">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="mt-5 mb-2 text-lg font-semibold tracking-tight text-slate-900 dark:text-white first:mt-0">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="mt-4 mb-1.5 text-base font-semibold text-slate-900 dark:text-white first:mt-0">
              {children}
            </h3>
          ),
          p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
          ul: ({ children }) => (
            <ul className="mb-3 list-disc space-y-1.5 ps-5 last:mb-0">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="mb-3 list-decimal space-y-1.5 ps-5 last:mb-0 tabular-nums">
              {children}
            </ol>
          ),
          li: ({ children }) => <li className="leading-[1.68]">{children}</li>,
          blockquote: ({ children }) => (
            <blockquote className="my-3.5 rounded-xl border border-slate-200 bg-slate-50/90 px-4 py-3 text-slate-700 dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-300">
              {children}
            </blockquote>
          ),
          hr: () => (
            <hr className="my-5 border-slate-200 dark:border-slate-800" />
          ),
          a: ({ href, children }) => {
            const safeHref = typeof href === "string" ? href.trim() : "";
            const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
              if (!safeHref) {
                e.preventDefault();
                return;
              }
              if (onRequestOpenLink) {
                e.preventDefault();
                onRequestOpenLink(safeHref);
              }
            };

            return (
              <a
                href={safeHref.startsWith("http") ? safeHref : "#blocked"}
                onClick={handleClick}
                rel="noopener noreferrer nofollow"
                className="inline-flex items-center gap-1 font-medium text-teal-700 underline decoration-teal-700/40 underline-offset-4 transition-colors hover:text-sky-700 hover:decoration-sky-700 dark:text-teal-400 dark:decoration-teal-400/40 dark:hover:text-sky-300"
              >
                <span>{children}</span>
                <Shield className="inline h-3 w-3 shrink-0 opacity-70" aria-hidden="true" />
              </a>
            );
          },
          table: ({ children }) => (
            <div className="nova-scroll my-4 overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
              <table className="w-full border-collapse text-sm tabular-nums">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-slate-50 text-slate-700 dark:bg-slate-900/80 dark:text-slate-300">
              {children}
            </thead>
          ),
          th: ({ children }) => (
            <th className="border-b border-slate-200 px-3.5 py-2.5 text-start font-semibold dark:border-slate-800">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border-b border-slate-100 px-3.5 py-2.5 text-slate-700 dark:border-slate-800/70 dark:text-slate-300">
              {children}
            </td>
          ),
          pre: ({ children }) => <>{children}</>,
          code: ({ className, children }) => {
            const match = /language-([\w-]+)/.exec(className || "");
            const rawCode = String(children ?? "").replace(/\n$/, "");
            const isBlock = Boolean(match) || rawCode.includes("\n");

            if (isBlock) {
              return (
                <CodeBlock
                  code={rawCode}
                  codeLang={match?.[1] ?? ""}
                  language={language}
                />
              );
            }

            return (
              <code
                dir="ltr"
                className="inline-block rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[0.86em] text-slate-900 dark:bg-slate-800 dark:text-slate-100"
              >
                {children}
              </code>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
      {isStreaming ? (
        <span className="nova-stream-caret" aria-hidden="true" />
      ) : null}
    </div>
  );
}
