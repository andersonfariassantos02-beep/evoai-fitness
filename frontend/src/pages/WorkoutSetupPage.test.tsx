import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import WorkoutSetupPage from "./WorkoutSetupPage";

const { authenticatedUser, row, legPress, cancelStartedWorkout, createManualWorkout, replaceUnstartedWorkout, loadExistingWorkout, previewAutomaticWorkout } = vi.hoisted(() => {
  const row = { key: "row", name: "Remada", sets: 3, repsMin: 8, repsMax: 12, muscle: "costas", movement: "puxar-horizontal", equipment: "máquina" };
  const legPress = { key: "leg-press", name: "Leg press", sets: 3, repsMin: 10, repsMax: 15, muscle: "quadriceps", movement: "agachar", equipment: "máquina" };
  return {
    authenticatedUser: { id: "admin-1" }, row, legPress,
    cancelStartedWorkout: vi.fn().mockResolvedValue(undefined),
    createManualWorkout: vi.fn().mockResolvedValue({}),
    replaceUnstartedWorkout: vi.fn().mockResolvedValue({}),
    loadExistingWorkout: vi.fn(),
    previewAutomaticWorkout: vi.fn().mockResolvedValue([row, legPress]),
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
}));
vi.mock("../services/workoutSessionService", () => ({
  cancelStartedWorkout: (...args: unknown[]) => cancelStartedWorkout(...args),
  createManualWorkout: (...args: unknown[]) => createManualWorkout(...args),
  replaceUnstartedWorkout: (...args: unknown[]) => replaceUnstartedWorkout(...args),
  loadExistingWorkout: (...args: unknown[]) => loadExistingWorkout(...args),
  previewAutomaticWorkout: (...args: unknown[]) => previewAutomaticWorkout(...args),
}));

function renderSetup() {
  return render(<MemoryRouter initialEntries={["/preparar-treino/2026-07-22?label=Full%20body%20A&planned=1"]}><Routes><Route path="/preparar-treino/:date" element={<WorkoutSetupPage />} /><Route path="/treino/:date" element={<p>Sessão aberta</p>} /></Routes></MemoryRouter>);
}

describe("preparação do treino", () => {
  beforeEach(() => { vi.clearAllMocks(); loadExistingWorkout.mockResolvedValue(null); previewAutomaticWorkout.mockResolvedValue([row, legPress]); });
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
    expect(await screen.findByText("SUGESTÃO NÃO CONFIRMADA")).toBeInTheDocument();
    expect(createManualWorkout).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Confirmar e criar treino" }));
    await waitFor(() => expect(createManualWorkout).toHaveBeenCalledWith("admin-1", "2026-07-22", "Full body A", [row, legPress]));
    expect(await screen.findByText("Sessão aberta")).toBeInTheDocument();
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
