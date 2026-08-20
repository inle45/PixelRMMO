import { useState, type FormEvent } from "react";
import TextField from "../ui/TextField";
import PasswordField from "../ui/PasswordField";
import Checkbox from "../ui/Checkbox";
import Button from "../ui/Button";

interface RegisterFormProps {
  onSubmit?: (data: {
    username: string;
    email: string;
    password: string;
  }) => Promise<void> | void;
}

const UserIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8">
    <circle cx="12" cy="8" r="3.5" />
    <path d="M4.5 20c1.5-4 5-5.5 7.5-5.5s6 1.5 7.5 5.5" strokeLinecap="round" />
  </svg>
);

const MailIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8">
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="M3.5 6.5L12 13l8.5-6.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export default function RegisterForm({ onSubmit }: RegisterFormProps) {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!username.trim() || !email.trim() || !password) {
      setError("Tous les champs sont requis.");
      return;
    }
    if (password.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }
    if (password !== confirm) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }
    if (!acceptTerms) {
      setError("Tu dois accepter les conditions d'utilisation du marché C2C.");
      return;
    }

    try {
      setLoading(true);
      await onSubmit?.({ username, email, password });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
      <TextField
        label="Pseudo"
        name="username"
        type="text"
        autoComplete="nickname"
        placeholder="Mercenaire#1234"
        icon={<UserIcon />}
        value={username}
        onChange={(e) => setUsername(e.target.value)}
      />

      <TextField
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        placeholder="toi@exemple.com"
        icon={<MailIcon />}
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      <PasswordField
        label="Mot de passe"
        name="password"
        placeholder="8 caractères minimum"
        autoComplete="new-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      <PasswordField
        label="Confirmation du mot de passe"
        name="confirm-password"
        placeholder="••••••••"
        autoComplete="new-password"
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
      />

      {error && <p className="-mt-1 text-xs text-red-300">{error}</p>}

      <Checkbox
        label={<>J'accepte les conditions d'utilisation du marché C2C.</>}
        checked={acceptTerms}
        onChange={(e) => setAcceptTerms(e.target.checked)}
      />

      <div className="pt-2">
        <Button type="submit" loading={loading}>
          Créer mon compte de Mercenaire
        </Button>
      </div>
    </form>
  );
}
