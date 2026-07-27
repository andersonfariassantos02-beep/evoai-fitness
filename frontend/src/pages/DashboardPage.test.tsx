import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import DashboardPage from "./DashboardPage";

const mocks = vi.hoisted(() => ({
  user: { id: "admin-1" },
  signOut: vi.fn().mockResolvedValue(undefined),
  isAdmin: vi.fn().mockResolvedValue(true),
}));

vi.mock("../contexts/AuthContext", () => ({
  useAuth: () => ({ user: mocks.user, signOut: mocks.signOut }),
}));

vi.mock("../services/exerciseCatalogService", () => ({
  isExerciseCatalogAdmin: () => mocks.isAdmin(),
}));

vi.mock("../services/trainingCalendarService", () => ({
  flushCalendarOutbox: vi.fn().mockResolvedValue(undefined),
  loadSyncedCalendar: vi.fn().mockResolvedValue({ entries: [], state: "synced" }),
  queueCalendarMutation: vi.fn().mockResolvedValue("synced"),
  loadLastCompletedWorkoutLabel: vi.fn().mockResolvedValue(null),
  loadWorkouts: vi.fn().mockResolvedValue([]),
}));

vi.mock("../services/profileRestrictionService", () => ({
  loadPlanningProfile: vi.fn().mockResolvedValue({ goal: "general_fitness", trainingFocus: ["full_body"] }),
}));

describe("painel principal", () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => cleanup());

  it("reúne a navegação no menu e remove a explicação repetida", async () => {
    const user = userEvent.setup();
    render(<DashboardPage />);

    expect(screen.queryByText("Nenhuma escala é presumida")).not.toBeInTheDocument();
    await user.click(screen.getByText("Menu"));
    expect(await screen.findByRole("navigation", { name: "Menu da conta" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Usuários" })).toHaveAttribute("href", "#/admin/usuarios");
    expect(screen.getByRole("link", { name: "Catálogo" })).toHaveAttribute("href", "#/admin/exercicios");
    expect(screen.getByRole("link", { name: "Meu perfil" })).toHaveAttribute("href", "#/perfil");

    await user.click(screen.getByRole("button", { name: "Sair" }));
    expect(mocks.signOut).toHaveBeenCalledOnce();
  });

  it("exibe os botões Semanal e Mensal e mantém o botão ativo", async () => {
    const user = userEvent.setup();
    render(<DashboardPage />);

    const weeklyButton = screen.getByTestId("view-toggle-weekly");
    const monthlyButton = screen.getByTestId("view-toggle-monthly");

    expect(weeklyButton).toBeInTheDocument();
    expect(monthlyButton).toBeInTheDocument();
    expect(weeklyButton).toHaveAttribute("aria-selected", "false");
    expect(monthlyButton).toHaveAttribute("aria-selected", "true");

    await user.click(weeklyButton);
    expect(weeklyButton).toHaveAttribute("aria-selected", "true");
    expect(monthlyButton).toHaveAttribute("aria-selected", "false");

    await user.click(monthlyButton);
    expect(weeklyButton).toHaveAttribute("aria-selected", "false");
    expect(monthlyButton).toHaveAttribute("aria-selected", "true");
  });

  it("mostra apenas a semana selecionada no modo semanal e o mês completo no modo mensal", async () => {
    const user = userEvent.setup();
    render(<DashboardPage />);

    const monthlyGrid = await screen.findByTestId("calendar-grid");
    expect(within(monthlyGrid).getAllByRole("button").length).toBeGreaterThan(28);

    await user.click(screen.getByTestId("view-toggle-weekly"));
    const weeklyGrid = await screen.findByTestId("calendar-grid");
    expect(within(weeklyGrid).getAllByRole("button").length).toBe(7);
  });

  it("preserva os dados do calendário ao trocar entre visualizações", async () => {
    const user = userEvent.setup();
    render(<DashboardPage />);

    await user.click(screen.getByTestId("view-toggle-weekly"));
    const weeklyButton = screen.getByTestId("view-toggle-weekly");
    expect(weeklyButton).toHaveAttribute("aria-selected", "true");

    const weeklyGrid = await screen.findByTestId("calendar-grid");
    expect(within(weeklyGrid).getAllByRole("button")).toHaveLength(7);

    await user.click(screen.getByTestId("view-toggle-monthly"));
    expect(screen.getByTestId("view-toggle-monthly")).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("heading", { name: /julho de 2026/i, level: 2 })).toBeInTheDocument();
  });
});
