import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthShell } from "../components/AuthShell";
import { useAuth } from "../contexts/AuthContext";
import { getAuthErrorMessage } from "../lib/authErrors";

export default function RegisterPage() {
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Use uma senha com pelo menos 8 caracteres.");
      return;
    }

    if (password !== confirmation) {
      setError("As senhas informadas não são iguais.");
      return;
    }

    setSubmitting(true);

    try {
      const needsConfirmation = await signUp(email.trim(), password);
      if (needsConfirmation) {
        navigate("/login", {
          replace: true,
          state: { registrationMessage: "Confira seu e-mail para confirmar a conta antes de entrar." },
        });
      } else {
        navigate("/app", { replace: true });
      }
    } catch (caughtError) {
      setError(getAuthErrorMessage(caughtError));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell
      eyebrow="COMECE SUA EVOLUÇÃO"
      title="Crie sua conta EvoAI."
      description="Um acesso seguro para manter seus treinos e sua evolução sempre disponíveis."
    >
      {error && <div className="form-message form-message--error" role="alert">{error}</div>}

      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        <label htmlFor="register-email">E-mail</label>
        <input
          id="register-email"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="voce@exemplo.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />

        <label htmlFor="register-password">Senha</label>
        <input
          id="register-password"
          type="password"
          autoComplete="new-password"
          placeholder="Mínimo de 8 caracteres"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          minLength={8}
          required
        />

        <label htmlFor="register-confirmation">Confirmar senha</label>
        <input
          id="register-confirmation"
          type="password"
          autoComplete="new-password"
          placeholder="Repita sua senha"
          value={confirmation}
          onChange={(event) => setConfirmation(event.target.value)}
          minLength={8}
          required
        />

        <button
          className="primary-button"
          type="submit"
          disabled={submitting || !email || !password || !confirmation}
        >
          {submitting ? "Criando conta…" : "Criar conta"}
        </button>
      </form>

      <p className="auth-switch">
        Já tem uma conta? <Link to="/login">Entrar</Link>
      </p>
    </AuthShell>
  );
}
