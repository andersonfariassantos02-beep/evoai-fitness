import { Navigate, Outlet, Route, Routes, useLocation } from "react-router-dom";
import { useAuth } from "./contexts/AuthContext";
import DashboardPage from "./pages/DashboardPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";

function LoadingScreen() {
  return (
    <main className="centered-screen" aria-live="polite" aria-busy="true">
      <span className="spinner" aria-hidden="true" />
      <p>Restaurando sua sessão…</p>
    </main>
  );
}

function ConfigurationScreen() {
  return (
    <main className="centered-screen">
      <section className="notice-card" aria-labelledby="configuration-title">
        <span className="notice-card__icon" aria-hidden="true">!</span>
        <p className="eyebrow">CONFIGURAÇÃO NECESSÁRIA</p>
        <h1 id="configuration-title">Conecte o Supabase para entrar.</h1>
        <p>
          Crie o arquivo <code>frontend/.env</code> e informe
          <code> VITE_SUPABASE_URL</code> e
          <code> VITE_SUPABASE_PUBLISHABLE_KEY</code>.
        </p>
      </section>
    </main>
  );
}

function ProtectedRoute() {
  const { configured, loading, session } = useAuth();
  const location = useLocation();

  if (!configured) return <ConfigurationScreen />;
  if (loading) return <LoadingScreen />;

  return session
    ? <Outlet />
    : <Navigate to="/login" replace state={{ from: location.pathname }} />;
}

function PublicOnlyRoute() {
  const { configured, loading, session } = useAuth();

  if (!configured) return <ConfigurationScreen />;
  if (loading) return <LoadingScreen />;

  return session ? <Navigate to="/app" replace /> : <Outlet />;
}

function RouteFallback() {
  const { loading, session } = useAuth();

  if (loading) return <LoadingScreen />;
  return <Navigate to={session ? "/app" : "/login"} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route element={<PublicOnlyRoute />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/cadastro" element={<RegisterPage />} />
      </Route>
      <Route element={<ProtectedRoute />}>
        <Route path="/app" element={<DashboardPage />} />
      </Route>
      <Route path="*" element={<RouteFallback />} />
    </Routes>
  );
}
