import { motion } from "motion/react";
import { ArrowUpLeft, ArrowUpRight, SlidersHorizontal } from "lucide-react";
import { COPY } from "../data/i18n.ts";
import { getRoleById, ROLES } from "../data/roles.ts";
import type { Language, RoleId } from "../types/chat.ts";
import { NovaLogo } from "./NovaLogo.tsx";

interface EmptyStateProps {
  roleId: RoleId;
  language: Language;
  onSelectRole: (roleId: RoleId) => void;
  onSelectPrompt: (prompt: string) => void;
  onOpenRoleDrawer: () => void;
}

export function EmptyState({
  roleId,
  language,
  onSelectRole,
  onSelectPrompt,
  onOpenRoleDrawer,
}: EmptyStateProps) {
  const t = COPY[language];
  const activeRole = getRoleById(roleId);
  const starters = activeRole.starters[language];
  const ArrowIcon = language === "ar" ? ArrowUpLeft : ArrowUpRight;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
      className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-4 py-8 sm:px-8 sm:py-10"
    >
      {/* Focal heading */}
      <div className="mb-8">
        <div className="mb-4 flex items-center gap-3">
          <NovaLogo size="lg" variant="solid" />
          <span
            dir="ltr"
            className="bg-gradient-to-r from-teal-700 via-cyan-700 to-sky-700 bg-clip-text font-display text-xl font-bold tracking-tight text-transparent dark:from-teal-300 dark:via-cyan-300 dark:to-sky-300"
          >
            {t.brand}
          </span>
        </div>
        <h1 className="font-display text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl dark:text-white">
          {t.emptyHeading}
        </h1>
        <p className="mt-3 max-w-2xl text-[15.5px] leading-relaxed text-slate-600 dark:text-slate-400">
          {t.emptySubheading}
        </p>
      </div>

      {/* Interactive role specialization switcher */}
      <div className="mb-7">
        <div className="mb-2.5 flex items-center justify-between gap-4">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
            {t.rolePickerHeading}
          </span>
          <button
            type="button"
            onClick={onOpenRoleDrawer}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-teal-700 transition-colors hover:text-sky-700 focus-visible:outline-2 focus-visible:outline-teal-600 dark:text-teal-400 dark:hover:text-sky-300 whitespace-nowrap shrink-0"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{t.settingsButton}</span>
          </button>
        </div>

        <div
          role="tablist"
          aria-label={t.rolePickerHeading}
          className="flex flex-wrap gap-1.5 rounded-xl border border-slate-200/80 bg-slate-100/85 p-1 dark:border-slate-800 dark:bg-slate-900/70"
        >
          {ROLES.map((role) => {
            const active = role.id === roleId;
            return (
              <button
                key={role.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => onSelectRole(role.id)}
                className={`h-9 flex-1 rounded-lg px-3 text-xs font-medium transition-all duration-150 focus-visible:outline-2 focus-visible:outline-teal-600 whitespace-nowrap shrink-0 sm:flex-initial ${
                  active
                    ? "bg-white text-slate-900 shadow-xs ring-1 ring-slate-200/80 dark:bg-slate-800 dark:text-white dark:ring-slate-700"
                    : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
                }`}
              >
                {role.name[language]}
              </button>
            );
          })}
        </div>

        <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
          {activeRole.summary[language]}
        </p>
      </div>

      {/* 2x2 starter prompt grid */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {starters.map((item) => (
          <button
            key={item.title}
            type="button"
            onClick={() => onSelectPrompt(item.prompt)}
            className="group flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white/90 p-4 text-start transition-all duration-150 hover:-translate-y-0.5 hover:border-teal-600/60 hover:bg-white hover:shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 dark:border-slate-800 dark:bg-slate-900/75 dark:hover:border-teal-500/60 dark:hover:bg-slate-900"
          >
            <div className="flex w-full items-start justify-between gap-2">
              <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {item.title}
              </span>
              <ArrowIcon
                className="h-4 w-4 shrink-0 text-slate-400 transition-transform duration-150 group-hover:scale-110 group-hover:text-teal-700 dark:group-hover:text-teal-400"
                aria-hidden="true"
              />
            </div>
            <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
              {item.prompt}
            </p>
          </button>
        ))}
      </div>
    </motion.div>
  );
}
