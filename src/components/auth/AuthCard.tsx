import { useState } from "react";
import TabSwitcher, { type AuthTab } from "./TabSwitcher";
import LoginForm from "./LoginForm";
import RegisterForm from "./RegisterForm";

interface AuthCardProps {
  onAuthenticated?: () => void;
}

export default function AuthCard({ onAuthenticated }: AuthCardProps) {
  const [tab, setTab] = useState<AuthTab>("login");

  return (
    <div
      className={
        "relative w-full max-w-md rounded-2xl border border-white/15 bg-white/[0.06] p-6 shadow-2xl " +
        "shadow-black/50 backdrop-blur-2xl sm:p-8 " +
        "before:pointer-events-none before:absolute before:inset-0 before:rounded-2xl " +
        "before:bg-gradient-to-b before:from-white/10 before:to-transparent before:opacity-60"
      }
    >
      <div className="relative flex flex-col items-center gap-1 pb-6 text-center">
        <span
          className="text-[10px] uppercase tracking-[0.3em] text-lantern-glow/80"
          style={{ fontFamily: "var(--font-pixel)" }}
        >
          PixelRMMO
        </span>
        <h1 className="text-xl font-bold text-white sm:text-2xl">
          {tab === "login" ? "Content de te revoir, Mercenaire" : "Rejoins la guilde"}
        </h1>
        <p className="text-sm text-white/55">
          {tab === "login"
            ? "Connecte-toi pour reprendre l'aventure."
            : "Crée ton compte pour accéder au marché C2C."}
        </p>
      </div>

      <div className="relative mb-6">
        <TabSwitcher active={tab} onChange={setTab} />
      </div>

      <div className="relative grid">
        <div
          key={tab}
          className="col-start-1 row-start-1 animate-[fadeIn_0.25s_ease-out]"
        >
          {tab === "login" ? (
            <LoginForm onSubmit={() => onAuthenticated?.()} />
          ) : (
            <RegisterForm onSubmit={() => onAuthenticated?.()} />
          )}
        </div>
      </div>

      <p className="relative pt-6 text-center text-xs text-white/45">
        {tab === "login" ? (
          <>
            Pas encore de compte ?{" "}
            <button
              type="button"
              onClick={() => setTab("register")}
              className="font-semibold text-lantern-glow hover:underline"
            >
              Inscris-toi
            </button>
          </>
        ) : (
          <>
            Déjà un compte ?{" "}
            <button
              type="button"
              onClick={() => setTab("login")}
              className="font-semibold text-lantern-glow hover:underline"
            >
              Connecte-toi
            </button>
          </>
        )}
      </p>
    </div>
  );
}
