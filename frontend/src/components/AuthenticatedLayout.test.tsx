import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AuthenticatedLayout from "./AuthenticatedLayout";

const mocks = vi.hoisted(() => ({
  signOut: vi.fn().mockResolvedValue(undefined),
  isAdmin: vi.fn().mockResolvedValue(true),
}));

vi.mock("../contexts/AuthContext", () => ({
  useAuth: () => ({
    user: { id: "admin-1", email: "admin@evoai.test" },
    signOut: mocks.signOut,
  }),
}));

vi.mock("../services/exerciseCatalogService", () => ({
  isExerciseCatalogAdmin: () => mocks.isAdmin(),
}));

describe("layout autenticado", () => {
  beforeEach(() => vi.clearAllMocks());

  it("exibe a navegação principal e as opções administrativas", async () => {
    render(
      <MemoryRouter initialEntries={["/app"]}>
        <Routes>
          <Route element={<AuthenticatedLayout />}>
            <Route path="/app" element={<p>Conteúdo do painel</p>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText("Conteúdo do painel")).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /painel/i }).length).toBeGreaterThan(0);
    expect(await screen.findAllByRole("link", { name: /laboratório/i })).not.toHaveLength(0);
    expect(screen.getAllByRole("link", { name: /relatórios/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("link", { name: /usuários/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("link", { name: /catálogo/i }).length).toBeGreaterThan(0);
  });

  it("permite encerrar a sessão pelo menu", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={["/app"]}>
        <Routes>
          <Route element={<AuthenticatedLayout />}>
            <Route path="/app" element={<p>Conteúdo do painel</p>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    await user.click(screen.getAllByRole("button", { name: "Sair" })[0]);
    expect(mocks.signOut).toHaveBeenCalledOnce();
  });
});
