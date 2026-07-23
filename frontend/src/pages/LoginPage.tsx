import { useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { AuthShell } from "../components/AuthShell";
import { useAuth } from "../contexts/AuthContext";
import { getAuthErrorMessage } from "../lib/authErrors";

interface LocationState {
  from?: string;
  registrationMessage?: string;
}

export default function LoginPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const confirmed = new URLSearchParams(location.search).get("confirmed") === "true";
  const locationState = location.state as LocationState | null;
  const destination = locationState?.from ?? "/app";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      await signIn(email.trim(), password);
      navigate(destination, { replace: true });
    } catch (caughtError) {
      setError(getAuthErrorMessage(caughtError));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell
      eyebrow="BEM-VINDO DE VOLTA"
      title="Entre para continuar sua evolução."
      description="Sua sessão e seu histórico ficam disponíveis sempre que você voltar."
    >
      {confirmed && (
        <div className="form-message form-message--success" role="status">
          E-mail confirmado. Agora você já pode entrar.
        </div>
      )}
      {locationState?.registrationMessage && (
        <div className="form-message form-message--success" role="status">
          {locationState.registrationMessage}
        </div>
      )}
      {error && <div className="form-message form-message--error" role="alert">{error}</div>}

      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        <label htmlFor="email">E-mail</label>
        <input
          id="email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="voce@exemplo.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />

        <label htmlFor="password">Senha</label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder="Sua senha"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          minLength={8}
          required
        />

        <button className="primary-button" type="submit" disabled={submitting || !email || !password}>
          {submitting ? "Entrando…" : "Entrar"}
        </button>
      </form>

      <p className="auth-help"><Link to="/esqueci-senha">Esqueci minha senha</Link></p>

      <p className="auth-switch">
        Ainda não tem uma conta? <Link to="/cadastro">Criar conta</Link>
      </p>
    </AuthShell>
  );
}
