import type { ReactNode } from "react";

interface AuthShellProps {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
}

export function AuthShell({ eyebrow, title, description, children }: AuthShellProps) {
  return (
    <main className="auth-layout">
      <section className="auth-intro" aria-labelledby="auth-title">
        <a className="brand brand--light" href="#/login" aria-label="EvoAI Fitness">
          <img className="brand__logo brand__logo--auth" src={`${import.meta.env.BASE_URL}evoai-fitness-logo.png`} alt="" />
        </a>
        <div>
          <span className="eyebrow">{eyebrow}</span>
          <h1 id="auth-title">{title}</h1>
          <p>{description}</p>
        </div>
        <small className="auth-intro__footer">Treino inteligente. Evolução consistente.</small>
      </section>

      <section className="auth-panel" aria-label="Formulário de acesso">
        <div className="auth-card">{children}</div>
      </section>
    </main>
  );
}
