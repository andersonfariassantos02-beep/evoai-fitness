import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import WorkoutSessionPage from "./WorkoutSessionPage";

const saveSet = vi.fn().mockResolvedValue(undefined);
const updateSession = vi.fn().mockResolvedValue(undefined);
const queueCalendarMutation = vi.fn().mockResolvedValue(undefined);
const loadExerciseGuidance = vi.fn().mockResolvedValue({});
const loadSubstitutionCandidates = vi.fn().mockResolvedValue([]);
const substituteExercise = vi.fn().mockResolvedValue(undefined);
const authenticatedUser = { id: "user-1" };

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
    startOrLoadWorkout: vi.fn().mockResolvedValue({
      id: "session-1", training_date: "2026-07-20", workout_label: "Full body", status: "active", notes: "", profile_id: null, profile_name: null, applied_restrictions: [],
      exercises: [{ id: "exercise-1", exercise_key: "row", exercise_name: "Remada", original_exercise_key: null, substitution_reason: null, position: 1, rest_seconds: 120, transition_rest_seconds: 180, recommendation: { action: "initial", loadKg: 0, reason: "Primeira execução" }, sets: [{ id: "set-1", set_number: 1, target_reps_min: 8, target_reps_max: 12, actual_reps: 10, load_kg: 20, rpe: 8, notes: "", completed: false, target_rest_seconds: null, actual_rest_seconds: null }] }],
    }),
    saveSet: (...args: unknown[]) => saveSet(...args),
    updateSession: (...args: unknown[]) => updateSession(...args),
    substituteExercise: (...args: unknown[]) => substituteExercise(...args),
  };
});

describe("percurso principal do treino", () => {
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
      sets: [{ id: "set-1", set_number: 1, target_reps_min: 8, target_reps_max: 12, actual_reps: 10, load_kg: 20, rpe: 8, notes: "", completed: false, target_rest_seconds: null, actual_rest_seconds: null }],
    });
    window.prompt = vi.fn()
      .mockReturnValueOnce("indisponibilidade")
      .mockReturnValueOnce("1");

    render(<MemoryRouter initialEntries={["/treino/2026-07-20?label=Full%20body&planned=1"]}><Routes><Route path="/treino/:date" element={<WorkoutSessionPage />} /></Routes></MemoryRouter>);
    await user.click(await screen.findByRole("button", { name: "Substituir" }));

    await waitFor(() => expect(substituteExercise).toHaveBeenCalled());
    expect(await screen.findByText(/Substituído por Remada alternativa/)).toBeInTheDocument();
  });
});
