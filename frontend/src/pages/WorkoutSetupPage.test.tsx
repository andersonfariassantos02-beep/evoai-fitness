import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import WorkoutSetupPage from "./WorkoutSetupPage";

const { authenticatedUser, row, legPress, cancelStartedWorkout, createManualWorkout, replaceUnstartedWorkout, loadExistingWorkout, previewAutomaticWorkout, loadDailyReadiness, saveDailyReadiness, loadActiveDeload, loadActiveTrainingCycle, loadPlanningProfile, loadWeeklyMuscleVolume } = vi.hoisted(() => {
  const row = { key: "row", name: "Remada", sets: 3, repsMin: 8, repsMax: 12, muscle: "costas", movement: "puxar-horizontal", equipment: "máquina" };
  const legPress = { key: "leg-press", name: "Leg press", sets: 3, repsMin: 10, repsMax: 15, muscle: "quadriceps", movement: "agachar", equipment: "máquina" };
  return {
    authenticatedUser: { id: "admin-1" }, row, legPress,
    cancelStartedWorkout: vi.fn().mockResolvedValue(undefined),
    createManualWorkout: vi.fn().mockResolvedValue({}),
    replaceUnstartedWorkout: vi.fn().mockResolvedValue({}),
    loadExistingWorkout: vi.fn(),
    previewAutomaticWorkout: vi.fn().mockResolvedValue([row, legPress]),
    loadDailyReadiness: vi.fn().mockResolvedValue(null),
    saveDailyReadiness: vi.fn().mockResolvedValue(undefined),
    loadActiveDeload: vi.fn().mockResolvedValue(null),
    loadActiveTrainingCycle: vi.fn().mockResolvedValue(null),
    loadPlanningProfile: vi.fn().mockResolvedValue({ goal: "general_fitness", trainingFocus: ["full_body"], displayName: "Teste" }),
    loadWeeklyMuscleVolume: vi.fn().mockResolvedValue([]),
  };
});

vi.mock("../contexts/AuthContext", () => ({ useAuth: () => ({ user: authenticatedUser }) }));
vi.mock("../services/exerciseCatalogService", () => ({
  isExerciseCatalogAdmin: vi.fn().mockResolvedValue(true),
  loadExerciseCatalog: vi.fn().mockResolvedValue([row, legPress]),
}));
vi.mock("../services/profileRestrictionService", () => ({
  exerciseConflictsWithRestrictions: vi.fn().mockReturnValue(false),
  loadActiveProfileContext: vi.fn().mockResolvedValue({ restrictions: [] }),
  loadPlanningProfile: (...args: unknown[]) => loadPlanningProfile(...args),
}));
vi.mock("../services/workoutSessionService", () => ({
  cancelStartedWorkout: (...args: unknown[]) => cancelStartedWorkout(...args),
  createManualWorkout: (...args: unknown[]) => createManualWorkout(...args),
  replaceUnstartedWorkout: (...args: unknown[]) => replaceUnstartedWorkout(...args),
  loadExistingWorkout: (...args: unknown[]) => loadExistingWorkout(...args),
  previewAutomaticWorkout: (...args: unknown[]) => previewAutomaticWorkout(...args),
}));
vi.mock("../services/readinessService", () => ({
  loadDailyReadiness: (...args: unknown[]) => loadDailyReadiness(...args),
  saveDailyReadiness: (...args: unknown[]) => saveDailyReadiness(...args),
}));
vi.mock("../services/deloadService", () => ({
  loadActiveDeload: (...args: unknown[]) => loadActiveDeload(...args),
}));
vi.mock("../services/trainingCycleService", () => ({
  loadActiveTrainingCycle: (...args: unknown[]) => loadActiveTrainingCycle(...args),
}));
vi.mock("../services/weeklyMuscleVolumeService", () => ({
  loadWeeklyMuscleVolume: (...args: unknown[]) => loadWeeklyMuscleVolume(...args),
}));

function renderSetup() {
  return render(<MemoryRouter initialEntries={["/preparar-treino/2026-07-22?label=Full%20body%20A&planned=1"]}><Routes><Route path="/preparar-treino/:date" element={<WorkoutSetupPage />} /><Route path="/treino/:date" element={<p>Sessão aberta</p>} /></Routes></MemoryRouter>);
}

describe("preparação do treino", () => {
  beforeEach(() => { vi.clearAllMocks(); loadExistingWorkout.mockResolvedValue(null); loadDailyReadiness.mockResolvedValue(null); loadActiveDeload.mockResolvedValue(null); loadActiveTrainingCycle.mockResolvedValue(null); loadPlanningProfile.mockResolvedValue({ goal: "general_fitness", trainingFocus: ["full_body"], displayName: "Teste" }); loadWeeklyMuscleVolume.mockResolvedValue([]); previewAutomaticWorkout.mockResolvedValue([row, legPress]); });
  afterEach(cleanup);

  it("aguarda a consulta do treino salvo sem exibir escolhas prematuramente", async () => {
    let resolveExisting: (value: null) => void = () => undefined;
    loadExistingWorkout.mockImplementation(() => new Promise<null>((resolve) => { resolveExisting = resolve; }));
    renderSetup();
    expect(screen.getByText("Carregando ficha do dia…")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Ver sugestão" })).not.toBeInTheDocument();
    resolveExisting(null);
    expect(await screen.findByRole("button", { name: "Ver sugestão" })).toBeInTheDocument();
  });

  it("mostra a prévia automática e só cria após confirmação", async () => {
    const user = userEvent.setup();
    renderSetup();
    await user.click(await screen.findByRole("button", { name: "Ver sugestão" }));
    expect(saveDailyReadiness).toHaveBeenCalledWith("admin-1", "2026-07-22", expect.objectContaining({ sleepHours: 7, fatigue: 2 }));
    expect(await screen.findByText("SUGESTÃO INTELIGENTE · NÃO CONFIRMADA")).toBeInTheDocument();
    expect(screen.getByText(/Prescrição ajustada para/)).toBeInTheDocument();
    expect(createManualWorkout).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Confirmar e criar treino" }));
    await waitFor(() => expect(createManualWorkout).toHaveBeenCalledWith(
      "admin-1", "2026-07-22", "Full body A",
      [expect.objectContaining({ key: "row", targetRpe: 8 }), expect.objectContaining({ key: "leg-press", targetRpe: 8 })],
    ));
    expect(await screen.findByText("Sessão aberta")).toBeInTheDocument();
  });

  it("aplica o deload ativo à sugestão automática sem trocar exercícios", async () => {
    loadActiveDeload.mockResolvedValue({
      id: "deload-1", userId: "admin-1", startsOn: "2026-07-22", endsOn: "2026-07-28",
      status: "active", volumeReductionPercent: 35, targetRpeMin: 6, targetRpeMax: 7, reason: "fadiga",
    });
    const user = userEvent.setup();
    renderSetup();
    expect(await screen.findByText("Semana de deload ativa")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Ver sugestão" }));
    expect(await screen.findByText(/Deload ativo: volume reduzido em 35%/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Confirmar e criar treino" }));
    await waitFor(() => expect(createManualWorkout).toHaveBeenCalledWith(
      "admin-1", "2026-07-22", "Full body A",
      [expect.objectContaining({ key: "row", sets: 2 }), expect.objectContaining({ key: "leg-press", sets: 2 })],
    ));
  });

  it("permite editar uma ficha persistida que ainda não começou", async () => {
    loadExistingWorkout.mockResolvedValue({ id: "session-1", workout_label: "Ficha do coach", status: "active", exercises: [{ id: "exercise-1", exercise_key: "row", exercise_name: "Remada", sets: [{ completed: false }] }] });
    const user = userEvent.setup();
    renderSetup();
    await user.click(await screen.findByRole("button", { name: "Editar ficha" }));
    await user.click(screen.getByRole("checkbox", { name: /Leg press/ }));
    await user.click(screen.getByRole("button", { name: "Salvar alterações" }));
    await waitFor(() => expect(replaceUnstartedWorkout).toHaveBeenCalledWith("admin-1", "2026-07-22", "session-1", "Ficha do coach", [row, legPress]));
  });

  it("restaura e permite atualizar o check-in salvo na mesma data", async () => {
    loadDailyReadiness.mockResolvedValue({
      id: "checkin-1", date: "2026-07-22", sleepHours: 5.5, energy: 2, soreness: 4,
      fatigue: 4, jointDiscomfort: false, availableMinutes: 45,
    });
    const user = userEvent.setup();
    renderSetup();
    expect(await screen.findByDisplayValue("5.5")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Check-in salvo" })).toBeDisabled();
    await user.selectOptions(screen.getByLabelText("Energia hoje"), "3");
    await user.click(screen.getByRole("button", { name: "Salvar check-in" }));
    await waitFor(() => expect(saveDailyReadiness).toHaveBeenCalledWith(
      "admin-1", "2026-07-22", expect.objectContaining({ energy: 3, sleepHours: 5.5 }),
    ));
  });

  it("encerra um treino iniciado antes de oferecer uma nova montagem", async () => {
    loadExistingWorkout.mockResolvedValue({ id: "session-1", workout_label: "Full body A", status: "active", exercises: [{ id: "exercise-1", exercise_key: "row", exercise_name: "Remada", sets: [{ completed: true }] }] });
    const user = userEvent.setup();
    renderSetup();
    await user.click(await screen.findByRole("button", { name: "Encerrar e montar outra ficha" }));
    expect(screen.getByText("Essa ação não poderá ser desfeita.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Encerrar treino e montar nova ficha" }));
    await waitFor(() => expect(cancelStartedWorkout).toHaveBeenCalledWith("session-1"));
    expect(await screen.findByRole("button", { name: "Montar minha ficha" })).toBeInTheDocument();
    expect(screen.getByText(/treino anterior foi encerrado e preservado no histórico/i)).toBeInTheDocument();
  });
});
