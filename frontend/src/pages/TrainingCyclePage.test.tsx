import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import TrainingCyclePage from "./TrainingCyclePage";

const mocks = vi.hoisted(() => ({
  loadActive: vi.fn(),
  create: vi.fn(),
  end: vi.fn(),
}));

vi.mock("../contexts/AuthContext", () => ({ useAuth: () => ({ user: { id: "user-1" } }) }));
vi.mock("../services/profileRestrictionService", () => ({
  loadPlanningProfile: vi.fn().mockResolvedValue({ goal: "hypertrophy", trainingFocus: ["chest"], displayName: "Anderson" }),
}));
vi.mock("../services/reportService", () => ({
  loadWorkoutReport: vi.fn().mockResolvedValue({ completedSessions: 4 }),
}));
vi.mock("../services/trainingCycleService", () => ({
  loadActiveTrainingCycle: (...args: unknown[]) => mocks.loadActive(...args),
  createTrainingCycle: (...args: unknown[]) => mocks.create(...args),
  endTrainingCycle: (...args: unknown[]) => mocks.end(...args),
}));

describe("ciclo de treino", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.loadActive.mockResolvedValue(null);
    mocks.create.mockImplementation(async (input) => ({ id: "cycle-1", status: "active", ...input }));
    mocks.end.mockResolvedValue(undefined);
  });
  afterEach(cleanup);

  it("cria um ciclo somente depois da confirmação", async () => {
    const user = userEvent.setup();
    render(<TrainingCyclePage />);
    expect(await screen.findByRole("heading", { name: "Defina a próxima etapa" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Iniciar ciclo" }));
    await waitFor(() => expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({
      userId: "user-1", goal: "hypertrophy", durationWeeks: 6, targetSessionsPerWeek: 3,
    })));
    expect(await screen.findByText(/Ciclo iniciado/)).toBeInTheDocument();
  });

  it("mostra progresso real e exige confirmação para encerrar", async () => {
    mocks.loadActive.mockResolvedValue({
      id: "cycle-1", userId: "user-1", name: "Hipertrofia 1", goal: "hypertrophy",
      trainingFocus: ["chest"], startsOn: "2026-07-27", durationWeeks: 6,
      targetSessionsPerWeek: 3, status: "active",
    });
    const user = userEvent.setup();
    render(<TrainingCyclePage />);
    expect(await screen.findByRole("heading", { name: "Hipertrofia 1" })).toBeInTheDocument();
    expect(screen.getByText("4")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Encerrar ciclo" }));
    expect(screen.getByRole("dialog", { name: "Encerrar o ciclo atual?" })).toBeInTheDocument();
    expect(mocks.end).not.toHaveBeenCalled();
  });
});
