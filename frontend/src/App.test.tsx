import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";

let auth = { configured: true, loading: false, session: null as object | null, user: null as object | null };

vi.mock("./contexts/AuthContext", () => ({ useAuth: () => auth }));
vi.mock("./pages/LoginPage", () => ({ default: () => <p>Tela de login</p> }));
vi.mock("./pages/RegisterPage", () => ({ default: () => <p>Cadastro</p> }));
vi.mock("./pages/OnboardingPage", () => ({ default: () => <p>Primeiro acesso</p> }));
vi.mock("./pages/ProfilePage", () => ({ default: () => <p>Meu perfil</p> }));
vi.mock("./pages/BodyProgressPage", () => ({ default: () => <p>Evolução corporal</p> }));
vi.mock("./pages/DashboardPage", () => ({ default: () => <p>Área protegida</p> }));
vi.mock("./pages/WorkoutSessionPage", () => ({ default: () => <p>Treino</p> }));
vi.mock("./components/AuthenticatedLayout", async () => {
  const { Outlet } = await import("react-router-dom");
  return { default: () => <Outlet /> };
});
vi.mock("./components/ProfileRequiredRoute", async () => {
  const { Outlet } = await import("react-router-dom");
  return { default: () => <Outlet /> };
});

describe("autenticação e sessão", () => {
  beforeEach(() => { auth = { configured: true, loading: false, session: null, user: null }; });

  it("redireciona visitante da área protegida para o login", () => {
    render(<MemoryRouter initialEntries={["/app"]}><App /></MemoryRouter>);
    expect(screen.getByText("Tela de login")).toBeInTheDocument();
  });

  it("redireciona usuário autenticado do login para a área protegida", () => {
    auth = { configured: true, loading: false, session: { access_token: "token" }, user: { id: "user-1" } };
    render(<MemoryRouter initialEntries={["/login"]}><App /></MemoryRouter>);
    expect(screen.getByText("Área protegida")).toBeInTheDocument();
  });

  it("protege e libera a gestão do perfil somente após autenticação", () => {
    auth = { configured: true, loading: false, session: { access_token: "token" }, user: { id: "user-1" } };
    render(<MemoryRouter initialEntries={["/perfil"]}><App /></MemoryRouter>);
    expect(screen.getByText("Meu perfil")).toBeInTheDocument();
  });

  it("protege e libera a evolução corporal somente após autenticação", () => {
    auth = { configured: true, loading: false, session: { access_token: "token" }, user: { id: "user-1" } };
    render(<MemoryRouter initialEntries={["/evolucao"]}><App /></MemoryRouter>);
    expect(screen.getByText("Evolução corporal")).toBeInTheDocument();
  });
});
