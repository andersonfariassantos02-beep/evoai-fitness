import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ReportsPageContent from "./ReportsPage";

function ReportsPage() {
  return <MemoryRouter><ReportsPageContent /></MemoryRouter>;
}

const mocks = vi.hoisted(() => ({
  load: vi.fn(),
  loadUnfinished: vi.fn(),
  deleteUnfinished: vi.fn(),
  save: vi.fn(),
  share: vi.fn(),
  loadEvolution: vi.fn(),
}));

vi.mock("../contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "user-1", email: "atleta@evoai.test", user_metadata: {} } }),
}));
vi.mock("../services/reportService", async () => {
  const actual = await vi.importActual<typeof import("../services/reportService")>("../services/reportService");
  return {
    ...actual,
    loadWorkoutReport: mocks.load,
    loadUnfinishedWorkouts: mocks.loadUnfinished,
    confirmPasswordAndDeleteUnfinishedWorkout: mocks.deleteUnfinished,
  };
});
vi.mock("../lib/reportPdf", () => ({
  saveReportPdf: mocks.save,
  shareReportPdf: mocks.share,
}));
vi.mock("../services/exerciseEvolutionService", () => ({
  loadExerciseEvolution: mocks.loadEvolution,
}));

const report = {
  startDate: "2026-07-27", endDate: "2026-08-02", plannedSessions: 3,
  workouts: [{ id: "w1", date: "2026-07-27", label: "Push", notes: "", startedAt: "", completedAt: "", completedSets: 1, skippedSets: 0, volume: 500, averageRpe: 8, exercises: [{ key: "bench", name: "Supino", originalKey: null, substitutionReason: null, volume: 500, estimated1Rm: 66.7, bestSet: { loadKg: 50, reps: 10 }, sets: [{ setNumber: 1, reps: 10, loadKg: 50, rpe: 8, isExtra: false, skipped: false, skipReason: null }] }] }],
  completedSessions: 1, adherence: 33.3, completedSets: 1, skippedSets: 0, totalReps: 10, totalVolume: 500, averageRpe: 8,
};

describe("página de relatórios", () => {
  afterEach(() => cleanup());
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.load.mockResolvedValueOnce(report).mockResolvedValueOnce({ ...report, workouts: [], completedSessions: 0, totalVolume: 0 });
    mocks.loadUnfinished.mockResolvedValue([]);
    mocks.deleteUnfinished.mockResolvedValue(undefined);
    mocks.loadEvolution.mockResolvedValue([{
      key: "bench",
      name: "Supino",
      points: [
        { date: "2026-06-29", loadKg: 45, reps: 10, volume: 1350, estimated1Rm: 60 },
        { date: "2026-07-27", loadKg: 50, reps: 10, volume: 1500, estimated1Rm: 66.7 },
      ],
    }]);
  });

  it("gera o relatório real e oferece PDF e compartilhamento", async () => {
    const user = userEvent.setup();
    render(<ReportsPage />);
    await user.click(screen.getByRole("button", { name: "Gerar relatório" }));

    expect(await screen.findByRole("heading", { name: "Treinos do período" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Push" })).toBeInTheDocument();
    expect(screen.getByText("S1: 50 kg × 10 · RPE 8")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Últimos 90 dias" })).toBeInTheDocument();
    expect(screen.getByLabelText("Exercício do gráfico")).toHaveValue("bench");
    expect(screen.getByText("+11,1%")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Salvar PDF" }));
    expect(mocks.save).toHaveBeenCalledOnce();
  });

  it("alterna para o relatório mensal", async () => {
    const user = userEvent.setup();
    render(<ReportsPage />);
    await user.click(screen.getByRole("tab", { name: "Mensal" }));
    expect(screen.getByLabelText("Escolha o mês")).toHaveAttribute("type", "month");
  });

  it("mostra treinos pendentes com acesso para continuar e finalizar", async () => {
    mocks.loadUnfinished.mockResolvedValueOnce([{
      id: "pending-1",
      date: "2026-07-27",
      label: "PUSH",
      status: "active",
      completedSets: 4,
      totalSets: 19,
    }]);
    const user = userEvent.setup();
    render(<ReportsPage />);
    await user.click(screen.getByRole("button", { name: "Gerar relatório" }));

    expect(await screen.findByRole("heading", { name: "Treinos aguardando finalização" })).toBeInTheDocument();
    expect(screen.getByText("4 de 19 séries registradas")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Continuar e finalizar" })).toHaveAttribute(
      "href",
      "/preparar-treino/2026-07-27?label=PUSH&planned=0",
    );
  });

  it("exige confirmação e senha para excluir um treino pendente", async () => {
    mocks.loadUnfinished.mockResolvedValueOnce([{
      id: "pending-1",
      date: "2026-07-27",
      label: "PUSH",
      status: "active",
      completedSets: 0,
      totalSets: 19,
    }]);
    const user = userEvent.setup();
    render(<ReportsPage />);
    await user.click(screen.getByRole("button", { name: "Gerar relatório" }));
    await user.click(await screen.findByRole("button", { name: "Excluir registro" }));

    expect(screen.getByRole("heading", { name: "Excluir “PUSH”?" })).toBeInTheDocument();
    await user.type(screen.getByLabelText("Senha atual"), "senha-segura");
    await user.click(screen.getByRole("button", { name: "Confirmar exclusão" }));

    expect(mocks.deleteUnfinished).toHaveBeenCalledWith("user-1", "pending-1", "senha-segura");
    expect(await screen.findByText("Treino de teste excluído definitivamente.")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "PUSH" })).not.toBeInTheDocument();
  });
});
vi.mock("../services/profileRestrictionService", () => ({
  loadProfileDisplayName: vi.fn().mockResolvedValue("Anderson Farias"),
}));
