import { useEffect, useRef, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { isExerciseCatalogAdmin } from "../services/exerciseCatalogService";
import { getAuthErrorMessage } from "../lib/authErrors";

const primaryLinks = [
  { to: "/app", icon: "▦", label: "Painel", end: true },
  { to: "/relatorios", icon: "▥", label: "Relatórios", end: false },
  { to: "/perfil", icon: "◎", label: "Perfil", end: false },
];

function Navigation({
  admin,
  onSignOut,
  onNavigate,
  busy,
}: {
  admin: boolean;
  onSignOut: () => void;
  onNavigate?: () => void;
  busy: boolean;
}) {
  const navigate = useNavigate();

  function openCalendar() {
    onNavigate?.();
    navigate("/app");
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => document.getElementById("training-calendar")?.scrollIntoView({ behavior: "smooth" }));
    });
  }

  return (
    <nav className="app-navigation" aria-label="Navegação principal">
      <div className="app-navigation__group">
        <span>PRINCIPAL</span>
        {primaryLinks.map((link) => (
          <NavLink key={`${link.label}-${link.to}`} end={link.end} to={link.to} onClick={onNavigate}>
            <i aria-hidden="true">{link.icon}</i>{link.label}
          </NavLink>
        ))}
        <button type="button" className="app-navigation__calendar" onClick={openCalendar}>
          <i aria-hidden="true">◫</i>Calendário
        </button>
      </div>
      {admin && (
        <div className="app-navigation__group">
          <span>ADMINISTRAÇÃO</span>
          <NavLink to="/admin/testes" onClick={onNavigate}><i aria-hidden="true">◇</i>Laboratório</NavLink>
          <NavLink to="/admin/usuarios" onClick={onNavigate}><i aria-hidden="true">♙</i>Usuários</NavLink>
          <NavLink to="/admin/exercicios" onClick={onNavigate}><i aria-hidden="true">⌘</i>Catálogo</NavLink>
        </div>
      )}
      <button type="button" className="app-navigation__signout" disabled={busy} onClick={() => {
        onNavigate?.();
        onSignOut();
      }}>
        <i aria-hidden="true">↪</i>{busy ? "Saindo…" : "Sair"}
      </button>
    </nav>
  );
}

export default function AuthenticatedLayout() {
  const { user, signOut } = useAuth();
  const [admin, setAdmin] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const mobileMenuRef = useRef<HTMLDetailsElement>(null);

  function closeMobileMenu() {
    if (mobileMenuRef.current) mobileMenuRef.current.open = false;
  }

  useEffect(() => {
    if (!user) return;
    let active = true;
    void isExerciseCatalogAdmin(user.id).then((value) => { if (active) setAdmin(value); });
    return () => { active = false; };
  }, [user]);

  async function handleSignOut() {
    setBusy(true);
    setError("");
    try {
      await signOut();
    } catch (caughtError) {
      setError(getAuthErrorMessage(caughtError));
      setBusy(false);
    }
  }

  return (
    <div className="authenticated-shell">
      <aside className="app-sidebar">
        <NavLink className="app-sidebar__brand" to="/app" aria-label="EvoAI Fitness — início">
          <img src={`${import.meta.env.BASE_URL}evoai-fitness-logo.png`} alt="" />
        </NavLink>
        <Navigation admin={admin} busy={busy} onSignOut={() => void handleSignOut()} />
        <small>Treino inteligente.<br />Evolução consistente.</small>
      </aside>

      <header className="app-mobile-header">
        <NavLink to="/app" aria-label="EvoAI Fitness — início">
          <img src={`${import.meta.env.BASE_URL}evoai-fitness-logo.png`} alt="" />
        </NavLink>
        <details className="app-mobile-menu" ref={mobileMenuRef}>
          <summary>Menu <span aria-hidden="true">⌄</span></summary>
          <Navigation
            admin={admin}
            busy={busy}
            onNavigate={closeMobileMenu}
            onSignOut={() => void handleSignOut()}
          />
        </details>
      </header>

      <div className="authenticated-content">
        {error && <p className="app-layout-error" role="alert">{error}</p>}
        <Outlet />
      </div>
    </div>
  );
}
