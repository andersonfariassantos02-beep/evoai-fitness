import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import WorkoutSessionPage from "./WorkoutSessionPage";

const saveSet = vi.fn().mockResolvedValue(undefined);
const updateSession = vi.fn().mockResolvedValue(undefined);
const finishWorkoutWithPending = vi.fn().mockResolvedValue(1);
const queueCalendarMutation = vi.fn().mockResolvedValue(undefined);
const loadExerciseGuidance = vi.fn().mockResolvedValue({});
const loadSubstitutionCandidates = vi.fn().mockResolvedValue([]);
const substituteExercise = vi.fn().mockResolvedValue(undefined);
const addExtraSet = vi.fn();
const removeExtraSet = vi.fn().mockResolvedValue(undefined);
const authenticatedUser = { id: "user-1" };
const baseSession = {
  id: "session-1", training_date: "2026-07-20", workout_label: "Full body", session_kind: "real", status: "active", notes: "", profile_id: null, profile_name: null, applied_restrictions: [],
  exercises: [{ id: "exercise-1", exercise_key: "row", exercise_name: "Remada", original_exercise_key: null, substitution_reason: null, position: 1, rest_seconds: 120, transition_rest_seconds: 180, recommendation: { action: "initial", loadKg: 0, reason: "Primeira execução" }, sets: [{ id: "set-1", set_number: 1, target_reps_min: 8, target_reps_max: 12, actual_reps: 10, load_kg: 20, rpe: 8, notes: "", completed: false, target_rest_seconds: null, actual_rest_seconds: null, is_extra: false, skipped_at: null, skip_reason: null }] }],
};
const startOrLoadWorkout = vi.fn().mockResolvedValue(baseSession);

vi.mock("../contexts/AuthContext", () => ({ useAuth: () => ({ user: authenticatedUser }) }));
vi.mock("../services/trainingCalendarService", () => ({ queueCalendarMutation: (...args: unknown[]) => queueCalendarMutation(...args) }));
vi.mock("../services/exerciseCatalogService", () => ({
  loadExerciseGuidance: (...args: unknown[]) => loadExerciseGuidance(...args),
  loadSubstitutionCandidates: (...args: unknown[]) => loadSubstitutionCandidates(...args),
}));
vi.mock("../services/workoutSessionService", async (importOriginal) => {
  const original = await importOriginal<typeof import("../services/workoutSessionService")>();
  return {
    ...original,
    startOrLoadWorkout: (...args: unknown[]) => startOrLoadWorkout(...args),
    saveSet: (...args: unknown[]) => saveSet(...args),
    updateSession: (...args: unknown[]) => updateSession(...args),
    finishWorkoutWithPending: (...args: unknown[]) => finishWorkoutWithPending(...args),
    substituteExercise: (...args: unknown[]) => substituteExercise(...args),
    addExtraSet: (...args: unknown[]) => addExtraSet(...args),
    removeExtraSet: (...args: unknown[]) => removeExtraSet(...args),
  };
});

describe("percurso principal do treino", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    startOrLoadWorkout.mockResolvedValue(baseSession);
    finishWorkoutWithPending.mockResolvedValue(1);
  });
  afterEach(() => cleanup());

  it("registra a série, conclui a sessão e retorna ao histórico", async () => {
    const user = userEvent.setup();
    render(<MemoryRouter initialEntries={["/treino/2026-07-20?label=Full%20body&planned=1"]}><Routes><Route path="/treino/:date" element={<WorkoutSessionPage />} /><Route path="/app" element={<p>Histórico</p>} /></Routes></MemoryRouter>);
    await user.click(await screen.findByRole("button", { name: "Concluir" }));
    await waitFor(() => expect(saveSet).toHaveBeenCalledWith(expect.objectContaining({ id: "set-1", completed: true })));
    await user.click(screen.getByRole("button", { name: "Finalizar treino" }));
    await waitFor(() => expect(updateSession).toHaveBeenCalledWith("session-1", "completed", ""));
    expect(queueCalendarMutation).toHaveBeenCalledWith("user-1", "2026-07-20", expect.objectContaining({
      completed: true, completedWasPlanned: true, completedLabel: "Full body",
    }));
    expect(await screen.findByText("Histórico")).toBeInTheDocument();
  });

  it("não propõe substituições de exercícios já presentes na sessão", async () => {
    const user = userEvent.setup();
    loadSubstitutionCandidates.mockResolvedValue([{ key: "row-alt", name: "Remada alternativa", muscle: "costas", movement: "puxar-horizontal", equipment: "barra", sets: 3, repsMin: 8, repsMax: 12, restSeconds: 120, transitionRestSeconds: 180 }]);
    window.prompt = vi.fn()
      .mockReturnValueOnce("indisponibilidade")
      .mockReturnValueOnce("1");

    render(<MemoryRouter initialEntries={["/treino/2026-07-20?label=Full%20body&planned=1"]}><Routes><Route path="/treino/:date" element={<WorkoutSessionPage />} /></Routes></MemoryRouter>);
    await user.click(await screen.findByRole("button", { name: "Substituir" }));

    await waitFor(() => expect(loadSubstitutionCandidates).toHaveBeenCalledWith("row", "indisponibilidade", expect.any(Array), ["row"]));
  });

  it("permite substituir um exercício com candidatos válidos", async () => {
    const user = userEvent.setup();
    loadSubstitutionCandidates.mockResolvedValue([{ key: "row-alt", name: "Remada alternativa", muscle: "costas", movement: "puxar-horizontal", equipment: "barra", sets: 3, repsMin: 8, repsMax: 12, restSeconds: 120, transitionRestSeconds: 180 }]);
    substituteExercise.mockResolvedValue({
      id: "exercise-1", exercise_key: "row-alt", exercise_name: "Remada alternativa", original_exercise_key: "row", substitution_reason: "indisponibilidade", position: 1,
      rest_seconds: 120, transition_rest_seconds: 180, recommendation: { action: "initial", loadKg: 0, reason: "Primeira execução" },
      sets: [{ id: "set-1", set_number: 1, target_reps_min: 8, target_reps_max: 12, actual_reps: 10, load_kg: 20, rpe: 8, notes: "", completed: false, target_rest_seconds: null, actual_rest_seconds: null, is_extra: false }],
    });
    window.prompt = vi.fn()
      .mockReturnValueOnce("indisponibilidade")
      .mockReturnValueOnce("1");

    render(<MemoryRouter initialEntries={["/treino/2026-07-20?label=Full%20body&planned=1"]}><Routes><Route path="/treino/:date" element={<WorkoutSessionPage />} /></Routes></MemoryRouter>);
    await user.click(await screen.findByRole("button", { name: "Substituir" }));

    await waitFor(() => expect(substituteExercise).toHaveBeenCalled());
    expect(await screen.findByText(/Substituído por Remada alternativa/)).toBeInTheDocument();
  });

  it("mantém o foco durante a digitação e calcula o RPE pelo esforço", async () => {
    const user = userEvent.setup();
    render(<MemoryRouter initialEntries={["/treino/2026-07-20?label=Full%20body&planned=1"]}><Routes><Route path="/treino/:date" element={<WorkoutSessionPage />} /></Routes></MemoryRouter>);
    const reps = await screen.findByRole("spinbutton", { name: "Repetições da série 1" });
    await user.clear(reps);
    await user.type(reps, "12");
    expect(reps).toHaveFocus();
    await user.selectOptions(screen.getByRole("combobox", { name: "Esforço da série 1" }), "2");
    await user.click(screen.getByRole("button", { name: "Concluir" }));
    await waitFor(() => expect(saveSet).toHaveBeenCalledWith(expect.objectContaining({ actual_reps: 12, rpe: 8, completed: true })));
  });

  it("destaca um novo recorde pessoal no treino real", async () => {
    const user = userEvent.setup();
    startOrLoadWorkout.mockResolvedValueOnce({
      ...baseSession,
      exercises: [{
        ...baseSession.exercises[0],
        personalBest: { loadKg: 15, reps: 10, estimated1Rm: 20, date: "2026-07-01" },
      }],
    });
    render(<MemoryRouter initialEntries={["/treino/2026-07-20?label=Full%20body"]}><Routes><Route path="/treino/:date" element={<WorkoutSessionPage />} /></Routes></MemoryRouter>);
    await user.click(await screen.findByRole("button", { name: "Concluir" }));
    expect(await screen.findByText("RECORDE PESSOAL")).toBeInTheDocument();
    expect(screen.getByText(/20 kg × 10 repetições/)).toBeInTheDocument();
  });

  it("não conclui uma série sem repetições e carga informadas", async () => {
    const user = userEvent.setup();
    render(<MemoryRouter initialEntries={["/treino/2026-07-20?label=Full%20body"]}><Routes><Route path="/treino/:date" element={<WorkoutSessionPage />} /></Routes></MemoryRouter>);
    const load = await screen.findByRole("spinbutton", { name: "Carga da série 1" });
    await user.clear(load);
    await user.click(screen.getByRole("button", { name: "Concluir" }));
    expect(await screen.findByText("Informe a carga. Para peso corporal, digite 0 kg.")).toBeInTheDocument();
    expect(saveSet).not.toHaveBeenCalled();
  });

  it("aplica a carga recomendada somente às séries vazias", async () => {
    const user = userEvent.setup();
    startOrLoadWorkout.mockResolvedValueOnce({
      ...baseSession,
      exercises: [{
        ...baseSession.exercises[0],
        recommendation: { action: "increase", loadKg: 42.5, reason: "Progressão validada pelo treino anterior." },
        sets: [
          { ...baseSession.exercises[0].sets[0], load_kg: null },
          { ...baseSession.exercises[0].sets[0], id: "set-2", set_number: 2, load_kg: 40 },
        ],
      }],
    });
    render(<MemoryRouter initialEntries={["/treino/2026-07-20?label=Full%20body"]}><Routes><Route path="/treino/:date" element={<WorkoutSessionPage />} /></Routes></MemoryRouter>);

    await user.click(await screen.findByRole("button", { name: "Aplicar às séries vazias" }));

    await waitFor(() => expect(saveSet).toHaveBeenCalledTimes(1));
    expect(saveSet).toHaveBeenCalledWith(expect.objectContaining({ id: "set-1", load_kg: 42.5 }));
    expect(screen.getByRole("spinbutton", { name: "Carga da série 1" })).toHaveValue(42.5);
    expect(screen.getByRole("spinbutton", { name: "Carga da série 2" })).toHaveValue(40);
  });

  it("informa as séries pendentes e finaliza somente após confirmação", async () => {
    const user = userEvent.setup();
    startOrLoadWorkout.mockResolvedValueOnce({
      ...baseSession,
      exercises: [{
        ...baseSession.exercises[0],
        sets: [
          { ...baseSession.exercises[0].sets[0], completed: true },
          { ...baseSession.exercises[0].sets[0], id: "set-2", set_number: 2, completed: false },
        ],
      }],
    });
    render(<MemoryRouter initialEntries={["/treino/2026-07-20?label=Full%20body&planned=1"]}><Routes><Route path="/treino/:date" element={<WorkoutSessionPage />} /><Route path="/app" element={<p>Histórico</p>} /></Routes></MemoryRouter>);
    await user.click(await screen.findByRole("button", { name: "Finalizar treino" }));
    expect(screen.getByRole("dialog", { name: "Finalizar mesmo assim?" })).toBeInTheDocument();
    expect(screen.getByText("Séries 2")).toBeInTheDocument();
    await user.selectOptions(screen.getByRole("combobox", { name: "Motivo" }), "Falta de tempo");
    await user.click(screen.getByRole("button", { name: "Finalizar com pendências" }));
    await waitFor(() => expect(finishWorkoutWithPending).toHaveBeenCalledWith("session-1", "", "Falta de tempo"));
    expect(await screen.findByText("Histórico")).toBeInTheDocument();
  });

  it("adiciona uma série extra ao exercício", async () => {
    const user = userEvent.setup();
    addExtraSet.mockResolvedValueOnce({
      id: "set-extra", set_number: 2, target_reps_min: 8, target_reps_max: 12,
      actual_reps: null, load_kg: null, rpe: null, notes: "", completed: false,
      target_rest_seconds: null, actual_rest_seconds: null, is_extra: true, skipped_at: null, skip_reason: null,
    });
    render(<MemoryRouter initialEntries={["/treino/2026-07-20?label=Full%20body&planned=1"]}><Routes><Route path="/treino/:date" element={<WorkoutSessionPage />} /></Routes></MemoryRouter>);
    await user.click(await screen.findByRole("button", { name: "+ Adicionar série" }));
    expect(await screen.findByText("Série 2")).toBeInTheDocument();
    expect(screen.getByText("extra")).toBeInTheDocument();
  });
});
