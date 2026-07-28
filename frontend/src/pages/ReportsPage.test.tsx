import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ReportsPage from "./ReportsPage";

const mocks = vi.hoisted(() => ({
  load: vi.fn(),
  save: vi.fn(),
  share: vi.fn(),
}));

vi.mock("../contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "user-1", email: "atleta@evoai.test", user_metadata: {} } }),
}));
vi.mock("../services/reportService", async () => {
  const actual = await vi.importActual<typeof import("../services/reportService")>("../services/reportService");
  return { ...actual, loadWorkoutReport: mocks.load };
});
vi.mock("../lib/reportPdf", () => ({
  saveReportPdf: mocks.save,
  shareReportPdf: mocks.share,
}));

const report = {
  startDate: "2026-07-27", endDate: "2026-08-02", plannedSessions: 3,
  workouts: [{ id: "w1", date: "2026-07-27", label: "Push", notes: "", startedAt: "", completedAt: "", completedSets: 1, skippedSets: 0, volume: 500, averageRpe: 8, exercises: [{ key: "bench", name: "Supino", originalKey: null, substitutionReason: null, volume: 500, sets: [{ setNumber: 1, reps: 10, loadKg: 50, rpe: 8, isExtra: false, skipped: false, skipReason: null }] }] }],
  completedSessions: 1, adherence: 33.3, completedSets: 1, skippedSets: 0, totalReps: 10, totalVolume: 500, averageRpe: 8,
};

describe("página de relatórios", () => {
  afterEach(() => cleanup());
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.load.mockResolvedValueOnce(report).mockResolvedValueOnce({ ...report, workouts: [], completedSessions: 0, totalVolume: 0 });
  });

  it("gera o relatório real e oferece PDF e compartilhamento", async () => {
    const user = userEvent.setup();
    render(<ReportsPage />);
    await user.click(screen.getByRole("button", { name: "Gerar relatório" }));

    expect(await screen.findByRole("heading", { name: "Treinos do período" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Push" })).toBeInTheDocument();
    expect(screen.getByText("S1: 50 kg × 10 · RPE 8")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Salvar PDF" }));
    expect(mocks.save).toHaveBeenCalledOnce();
  });

  it("alterna para o relatório mensal", async () => {
    const user = userEvent.setup();
    render(<ReportsPage />);
    await user.click(screen.getByRole("tab", { name: "Mensal" }));
    expect(screen.getByLabelText("Escolha o mês")).toHaveAttribute("type", "month");
  });
});
