interface NovaLogoProps {
  size?: "sm" | "md" | "lg";
  variant?: "solid" | "outline";
}

export function NovaLogo({ size = "md", variant = "solid" }: NovaLogoProps) {
  const dimensions =
    size === "sm"
      ? "h-8 w-8 rounded-lg"
      : size === "lg"
        ? "h-12 w-12 rounded-2xl"
        : "h-8 w-8 rounded-lg";

  const iconSize = size === "lg" ? 26 : size === "sm" ? 18 : 19;

  const surfaceClass =
    variant === "outline"
      ? "border border-teal-500/25 bg-gradient-to-br from-white via-teal-50/60 to-sky-50/70 text-teal-700 shadow-xs dark:border-teal-400/25 dark:from-slate-900 dark:via-slate-900 dark:to-teal-950/60 dark:text-teal-300"
      : "bg-gradient-to-br from-teal-600 via-cyan-600 to-sky-600 text-white shadow-sm shadow-teal-900/15 dark:from-teal-500 dark:via-cyan-500 dark:to-sky-500";

  return (
    <span
      aria-hidden="true"
      className={`relative flex shrink-0 items-center justify-center overflow-hidden ${dimensions} ${surfaceClass}`}
    >
      <svg
        width={iconSize}
        height={iconSize}
        viewBox="0 0 28 28"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle
          cx="14"
          cy="14"
          r="10.25"
          stroke="currentColor"
          strokeOpacity="0.28"
          strokeWidth="1.25"
        />
        <path
          d="M14 3.5L16.35 11.65L24.5 14L16.35 16.35L14 24.5L11.65 16.35L3.5 14L11.65 11.65L14 3.5Z"
          fill="currentColor"
        />
        <circle
          cx="14"
          cy="14"
          r="2.1"
          fill={variant === "solid" ? "#0B1120" : "currentColor"}
          fillOpacity={variant === "solid" ? "0.22" : "0.18"}
        />
      </svg>
    </span>
  );
}
