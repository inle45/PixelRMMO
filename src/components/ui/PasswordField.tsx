import { forwardRef, useId, useState, type InputHTMLAttributes } from "react";

type PasswordFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
};

const EyeIcon = ({ open }: { open: boolean }) => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8">
    {open ? (
      <>
        <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="12" cy="12" r="3" />
      </>
    ) : (
      <>
        <path
          d="M3 3l18 18M10.6 10.6a3 3 0 0 0 4.24 4.24M6.6 6.7C4.2 8.2 2 12 2 12s3.6 7 10 7c1.85 0 3.45-.47 4.8-1.16M9.9 4.24A10.6 10.6 0 0 1 12 4c6.4 0 10 8 10 8a17.7 17.7 0 0 1-2.42 3.51"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </>
    )}
  </svg>
);

const PasswordField = forwardRef<HTMLInputElement, PasswordFieldProps>(
  ({ label, error, id, ...rest }, ref) => {
    const [visible, setVisible] = useState(false);
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
          <input
            ref={ref}
            id={inputId}
            type={visible ? "text" : "password"}
            autoComplete={rest.autoComplete ?? "current-password"}
            {...rest}
            className="w-full min-w-0 bg-transparent text-sm text-white placeholder:text-white/35 outline-none"
          />
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            aria-label={visible ? "Masquer le mot de passe" : "Afficher le mot de passe"}
            aria-pressed={visible}
            className="shrink-0 text-white/45 transition-colors hover:text-lantern-glow focus-visible:outline-none focus-visible:text-lantern-glow"
          >
            <EyeIcon open={visible} />
          </button>
        </div>
        {error && <p className="text-xs text-red-300">{error}</p>}
      </div>
    );
  },
);

PasswordField.displayName = "PasswordField";
export default PasswordField;
