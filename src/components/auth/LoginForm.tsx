import { useState, type FormEvent } from "react";
import TextField from "../ui/TextField";
import PasswordField from "../ui/PasswordField";
import Checkbox from "../ui/Checkbox";
import Button from "../ui/Button";

interface LoginFormProps {
  onSubmit?: (data: { identifier: string; password: string; remember: boolean }) => Promise<void> | void;
}

const UserIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8">
    <circle cx="12" cy="8" r="3.5" />
    <path d="M4.5 20c1.5-4 5-5.5 7.5-5.5s6 1.5 7.5 5.5" strokeLinecap="round" />
  </svg>
);

export default function LoginForm({ onSubmit }: LoginFormProps) {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!identifier.trim() || !password) {
      setError("Renseigne ton identifiant et ton mot de passe.");
      return;
    }

    try {
      setLoading(true);
      await onSubmit?.({ identifier, password, remember });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
      <TextField
        label="Pseudo ou Email"
        name="identifier"
        type="text"
        autoComplete="username"
        placeholder="Mercenaire#1234"
        icon={<UserIcon />}
        value={identifier}
        onChange={(e) => setIdentifier(e.target.value)}
      />

      <PasswordField
        label="Mot de passe"
        name="password"
        placeholder="••••••••"
        autoComplete="current-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      {error && <p className="-mt-1 text-xs text-red-300">{error}</p>}

      <div className="flex items-center justify-between pt-1">
        <Checkbox
          label="Se souvenir de moi"
          checked={remember}
          onChange={(e) => setRemember(e.target.checked)}
        />
        <a
          href="#mot-de-passe-oublie"
          className="text-xs font-medium text-white/60 underline-offset-4 transition-colors hover:text-lantern-glow hover:underline"
        >
          Mot de passe oublié ?
        </a>
      </div>

      <div className="pt-2">
        <Button type="submit" loading={loading}>
          Entrer dans PixelRMMO
        </Button>
      </div>
    </form>
  );
}
