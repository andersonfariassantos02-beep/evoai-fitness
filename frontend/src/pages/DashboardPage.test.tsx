import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import DashboardPage from "./DashboardPage";

const mocks = vi.hoisted(() => ({
  user: { id: "admin-1" },
  signOut: vi.fn().mockResolvedValue(undefined),
  isAdmin: vi.fn().mockResolvedValue(true),
  fatigue: {
    level: "attention",
    title: "Recuperação merece atenção",
    summary: "Há sinais de esforço elevado.",
    recommendation: "Evite buscar recordes na próxima sessão.",
    signals: ["RPE médio recente elevado (8,8)"],
    recentSessions: 3,
  },
  loadActiveDeload: vi.fn().mockResolvedValue(null),
  startDeload: vi.fn(),
  endDeload: vi.fn().mockResolvedValue(undefined),
  loadActiveTrainingCycle: vi.fn().mockResolvedValue(null),
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
  loadPlanningProfile: vi.fn().mockResolvedValue({ goal: "general_fitness", trainingFocus: ["full_body"], displayName: "Anderson Farias" }),
}));
vi.mock("../services/muscleRecoveryService", () => ({
  loadMuscleRecovery: vi.fn().mockResolvedValue([
    { muscle: "peito", status: "recovering", lastStimulusAt: "2026-07-29T10:00:00Z", recoveryHours: 60, remainingHours: 40, completedSets: 8 },
    { muscle: "costas", status: "ready", lastStimulusAt: null, recoveryHours: 0, remainingHours: 0, completedSets: 0 },
  ]),
}));
vi.mock("../services/fatigueService", () => ({
  loadFatigueAssessment: vi.fn().mockImplementation(() => Promise.resolve(mocks.fatigue)),
}));
vi.mock("../services/deloadService", () => ({
  loadActiveDeload: (...args: unknown[]) => mocks.loadActiveDeload(...args),
  startDeload: (...args: unknown[]) => mocks.startDeload(...args),
  endDeload: (...args: unknown[]) => mocks.endDeload(...args),
}));
vi.mock("../services/trainingCycleService", () => ({
  loadActiveTrainingCycle: (...args: unknown[]) => mocks.loadActiveTrainingCycle(...args),
}));
vi.mock("../services/reportService", () => ({
  loadWorkoutReport: vi.fn().mockResolvedValue({ completedSessions: 0 }),
}));
vi.mock("../services/weeklyMuscleVolumeService", () => ({
  loadWeeklyMuscleVolume: vi.fn().mockResolvedValue([
    { muscle: "peito", directSets: 6, indirectSets: 0, totalSets: 6 },
  ]),
}));
vi.mock("../services/monthlyTrainingGoalService", () => ({
  loadMonthlyCompletedWorkoutDates: vi.fn().mockResolvedValue([]),
}));

describe("painel principal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.fatigue.level = "attention";
    mocks.fatigue.title = "Recuperação merece atenção";
    mocks.loadActiveDeload.mockResolvedValue(null);
    mocks.loadActiveTrainingCycle.mockResolvedValue(null);
    mocks.startDeload.mockResolvedValue({
      id: "deload-1", userId: "admin-1", startsOn: "2026-07-29", endsOn: "2026-08-04",
      status: "active", volumeReductionPercent: 35, targetRpeMin: 6, targetRpeMax: 7, reason: "fadiga",
    });
  });
  afterEach(() => cleanup());

  it("apresenta o resumo de treino sem repetir a explicação antiga", async () => {
    render(<DashboardPage />);

    expect(screen.queryByText("Nenhuma escala é presumida")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /bem-vindo/i })).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "Bem-vindo, Anderson Farias!" })).toBeInTheDocument();
    expect(screen.getByText("PRÓXIMO TREINO")).toBeInTheDocument();
    expect(screen.getByText("PROGRESSO SEMANAL")).toBeInTheDocument();
    expect(screen.getByText("FOCO MUSCULAR")).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "Status dos grupos musculares" })).toBeInTheDocument();
    expect(screen.getByText("Estimativa: 40h restantes")).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "Recuperação merece atenção" })).toBeInTheDocument();
    expect(screen.getByText("Evite buscar recordes na próxima sessão.")).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "Séries da semana" })).toBeInTheDocument();
    expect(screen.getByText(/6 de .* séries/)).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "Defina sua meta no calendário" })).toBeInTheDocument();
  });

  it("permite confirmar e ativar o deload sugerido", async () => {
    mocks.fatigue.level = "deload";
    mocks.fatigue.title = "Deload sugerido";
    const user = userEvent.setup();
    render(<DashboardPage />);

    await user.click(await screen.findByRole("button", { name: "Preparar semana de deload" }));
    expect(screen.getByRole("dialog", { name: "Ativar 7 dias de deload?" })).toBeInTheDocument();
    expect(screen.getByText(/reduzir aproximadamente 35% das séries/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Ativar deload" }));
    expect(mocks.startDeload).toHaveBeenCalledWith("admin-1", expect.any(String), expect.stringContaining("RPE"));
    expect(await screen.findByText(/Semana de deload ativada/)).toBeInTheDocument();
  });

  it("oferece a criação de um ciclo quando não existe ciclo ativo", async () => {
    render(<DashboardPage />);
    expect(await screen.findByRole("heading", { name: "Estruture sua próxima evolução" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Criar ciclo/ })).toHaveAttribute("href", "#/ciclo");
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
