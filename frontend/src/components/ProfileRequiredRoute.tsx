import { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { hasLinkedProfile } from "../services/profileRestrictionService";

export default function ProfileRequiredRoute() {
  const { user } = useAuth();
  const location = useLocation();
  const [state, setState] = useState<"loading" | "ready" | "missing" | "error">("loading");

  useEffect(() => {
    if (!user) return;
    let active = true;
    setState("loading");
    void hasLinkedProfile(user.id)
      .then((exists) => { if (active) setState(exists ? "ready" : "missing"); })
      .catch(() => { if (active) setState("error"); });
    return () => { active = false; };
  }, [user]);

  if (state === "loading") {
    return <main className="centered-screen" aria-live="polite" aria-busy="true"><span className="spinner" aria-hidden="true" /><p>Verificando seu perfil…</p></main>;
  }
  if (state === "error") {
    return <main className="centered-screen"><section className="notice-card"><p className="eyebrow">CONEXÃO PENDENTE</p><h1>Não foi possível verificar seu perfil.</h1><p>Confira sua conexão e tente novamente.</p><button type="button" onClick={() => window.location.reload()}>Tentar novamente</button></section></main>;
  }
  if (state === "missing") {
    return <Navigate to="/onboarding" replace state={{ from: location.pathname }} />;
  }
  return <Outlet />;
}
