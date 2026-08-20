import type { ButtonHTMLAttributes } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  loading?: boolean;
};

export default function Button({ children, loading, disabled, className = "", ...rest }: ButtonProps) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={
        "group relative w-full overflow-hidden rounded-xl px-4 py-3 text-sm font-semibold tracking-wide text-[#1a1004] " +
        "bg-gradient-to-r from-lantern via-lantern-glow to-mercenary " +
        "shadow-[0_4px_20px_rgba(255,179,71,0.35)] transition-all duration-200 " +
        "hover:shadow-[0_6px_28px_rgba(255,179,71,0.55)] hover:brightness-105 " +
        "active:scale-[0.97] active:brightness-95 " +
        "disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:shadow-none " +
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lantern-glow focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b0f1a] " +
        className
      }
    >
      <span className="pointer-events-none absolute inset-0 -translate-x-full bg-white/25 transition-transform duration-500 group-hover:translate-x-full" />
      <span className="relative flex items-center justify-center gap-2">
        {loading && (
          <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-80" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
          </svg>
        )}
        {children}
      </span>
    </button>
  );
}
