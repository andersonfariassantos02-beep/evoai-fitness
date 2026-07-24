import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
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
});
