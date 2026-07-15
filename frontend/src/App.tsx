import type { ReactNode } from "react";
import { isSupabaseConfigured } from "./lib/supabase";

type StatusTone = "ready" | "attention" | "planned";

interface StatusCardProps {
  title: string;
  description: string;
  tone: StatusTone;
  icon: ReactNode;
}

const statusLabels: Record<StatusTone, string> = {
  ready: "Pronto",
  attention: "Configurar",
  planned: "Próxima etapa",
};

function StatusCard({ title, description, tone, icon }: StatusCardProps) {
  return (
    <article className="status-card">
      <div className={`status-card__icon status-card__icon--${tone}`}>{icon}</div>
      <div className="status-card__content">
        <span className={`status-pill status-pill--${tone}`}>{statusLabels[tone]}</span>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
    </article>
  );
}

export default function App() {
  const supabaseTone: StatusTone = isSupabaseConfigured ? "ready" : "attention";

  return (
    <div className="app-shell">
      <header className="app-header">
        <a className="brand" href="#top" aria-label="EvoAI Fitness — início">
          <span className="brand__mark" aria-hidden="true">E</span>
          <span>
            <strong>EvoAI</strong>
            <small>Fitness</small>
          </span>
        </a>
        <span className="version-badge">Fundação P0</span>
      </header>

      <main id="top">
        <section className="hero" aria-labelledby="hero-title">
          <div>
            <span className="eyebrow">BASE DO APLICATIVO</span>
            <h1 id="hero-title">Pronto para evoluir, série por série.</h1>
            <p>
              A fundação mobile-first do EvoAI Fitness agora está preparada
              para autenticação, perfis familiares e treino ao vivo.
            </p>
          </div>
          <div className="hero__signal" aria-label="Aplicativo instalável">
            <span className="hero__pulse" />
            <strong>PWA instalável</strong>
            <small>Funciona como aplicativo no celular</small>
          </div>
        </section>

        <section className="status-grid" aria-label="Estado da fundação">
          <StatusCard
            title="React + TypeScript"
            description="Código tipado, estrutura moderna e build validado com Vite."
            tone="ready"
            icon="TS"
          />
          <StatusCard
            title="Supabase"
            description={
              isSupabaseConfigured
                ? "Variáveis locais detectadas; cliente pronto para autenticação."
                : "Adicione a URL e a chave publicável no arquivo .env local."
            }
            tone={supabaseTone}
            icon="S"
          />
          <StatusCard
            title="Autenticação"
            description="Login, sessão persistente e rotas protegidas entram na próxima entrega."
            tone="planned"
            icon="→"
          />
        </section>

        <section className="next-step" aria-labelledby="next-step-title">
          <div>
            <span className="eyebrow">PRÓXIMO PASSO</span>
            <h2 id="next-step-title">Implementar login e rotas protegidas</h2>
          </div>
          <span className="next-step__number">02</span>
        </section>
      </main>

      <footer className="app-footer">
        <span>EvoAI Fitness</span>
        <span>Base técnica • P0</span>
      </footer>
    </div>
  );
}
