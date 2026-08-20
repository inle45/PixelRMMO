import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from "react";

type TextFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
  icon?: ReactNode;
  trailing?: ReactNode;
};

const TextField = forwardRef<HTMLInputElement, TextFieldProps>(
  ({ label, error, icon, trailing, className = "", id, ...rest }, ref) => {
    const generatedId = useId();
    const inputId = id ?? generatedId;

    return (
      <div className="flex flex-col gap-1.5">
        <label htmlFor={inputId} className="text-xs font-medium text-white/70">
          {label}
        </label>
        <div
          className={
            "flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-3.5 py-2.5 " +
            "transition-colors duration-150 focus-within:border-lantern/70 focus-within:bg-white/[0.07] " +
            "focus-within:ring-2 focus-within:ring-lantern/25 " +
            (error ? "border-red-400/60 focus-within:border-red-400/70 focus-within:ring-red-400/20" : "")
          }
        >
          {icon && <span className="shrink-0 text-white/45">{icon}</span>}
          <input
            ref={ref}
            id={inputId}
            {...rest}
            className={
              "w-full min-w-0 bg-transparent text-sm text-white placeholder:text-white/35 " +
              "outline-none " +
              className
            }
          />
          {trailing && <span className="shrink-0">{trailing}</span>}
        </div>
        {error && <p className="text-xs text-red-300">{error}</p>}
      </div>
    );
  },
);

TextField.displayName = "TextField";
export default TextField;
