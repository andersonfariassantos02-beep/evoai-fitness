import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { getAuthErrorMessage } from "../lib/authErrors";

export default function DashboardPage() {
  const { user, signOut } = useAuth();
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSignOut() {
    setError("");
    setSubmitting(true);

    try {
      await signOut();
    } catch (caughtError) {
      setError(getAuthErrorMessage(caughtError));
      setSubmitting(false);
    }
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <a className="brand" href="#/app" aria-label="EvoAI Fitness — início">
          <span className="brand__mark" aria-hidden="true">E</span>
          <span><strong>EvoAI</strong><small>Fitness</small></span>
        </a>
        <button className="secondary-button" type="button" onClick={handleSignOut} disabled={submitting}>
          {submitting ? "Saindo…" : "Sair"}
        </button>
      </header>

      <main>
        {error && <div className="form-message form-message--error" role="alert">{error}</div>}
        <section className="dashboard-hero" aria-labelledby="dashboard-title">
          <span className="eyebrow">ACESSO PROTEGIDO</span>
          <h1 id="dashboard-title">Sua evolução começa aqui.</h1>
          <p>Você entrou como <strong>{user?.email}</strong>. Sua sessão será restaurada quando o aplicativo for reaberto.</p>
        </section>

        <section className="status-grid" aria-label="Estado do produto">
          <article className="status-card">
            <span className="status-card__icon status-card__icon--ready">✓</span>
            <div className="status-card__content">
              <span className="status-pill status-pill--ready">Concluído</span>
              <h2>Autenticação segura</h2>
              <p>Login, cadastro, sessão persistente, proteção de rotas e logout com Supabase Auth.</p>
            </div>
          </article>
          <article className="status-card">
            <span className="status-card__icon status-card__icon--planned">03</span>
            <div className="status-card__content">
              <span className="status-pill status-pill--planned">Próxima etapa</span>
              <h2>Perfis familiares</h2>
              <p>Famílias, perfis autorizados e restrições individuais entram na próxima entrega.</p>
            </div>
          </article>
        </section>
      </main>

      <footer className="app-footer"><span>EvoAI Fitness</span><span>Autenticação • P0.2</span></footer>
    </div>
  );
}
