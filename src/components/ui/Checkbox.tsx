import { useId, type InputHTMLAttributes, type ReactNode } from "react";

type CheckboxProps = InputHTMLAttributes<HTMLInputElement> & {
  label: ReactNode;
};

export default function Checkbox({ label, id, className = "", ...rest }: CheckboxProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;

  return (
    <label htmlFor={inputId} className={"flex cursor-pointer items-start gap-2.5 select-none " + className}>
      <span className="relative mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center">
        <input id={inputId} type="checkbox" {...rest} className="peer sr-only" />
        <span
          className={
            "h-[18px] w-[18px] rounded-md border border-white/25 bg-white/5 transition-all duration-150 " +
            "peer-checked:border-lantern peer-checked:bg-lantern " +
            "peer-focus-visible:ring-2 peer-focus-visible:ring-lantern-glow peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-[#0b0f1a]"
          }
        />
        <svg
          className="pointer-events-none absolute h-3 w-3 scale-0 text-[#1a1004] transition-transform duration-150 peer-checked:scale-100"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
        >
          <path d="M4 12l6 6L20 6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <span className="text-xs leading-snug text-white/70">{label}</span>
    </label>
  );
}
