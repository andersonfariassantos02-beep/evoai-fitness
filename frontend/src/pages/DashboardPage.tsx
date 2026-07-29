import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import {
  addDays,
  buildWeeklyPlan,
  fromDateKey,
  getMonthGrid,
  getWeekDates,
  getWeekStart,
  loadCalendarEntries,
  saveCalendarEntries,
  toDateKey,
  type TrainingCalendarEntry,
} from "../lib/trainingCalendar";
import {
  flushCalendarOutbox,
  loadSyncedCalendar,
  queueCalendarMutation,
  loadLastCompletedWorkoutLabel,
  loadWorkouts,
  type CalendarSyncState,
  type WorkoutSummary,
} from "../services/trainingCalendarService";
import { loadPlanningProfile, type PlanningProfile } from "../services/profileRestrictionService";
import { MUSCLE_LABELS, summarizePlannedMuscleVolume } from "../lib/trainingVolume";

const WEEK_DAYS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

function formatMonth(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(date);
}

function formatFullDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(fromDateKey(value));
}

function formatShortDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
  }).format(fromDateKey(value));
}

function formatWeekRange(start: Date) {
  const end = addDays(start, 6);
  const formatter = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit" });
  return `Semana de ${formatter.format(start)} a ${formatter.format(end)}`;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const today = useMemo(() => new Date(), []);
  const todayKey = toDateKey(today);
  const storageKey = `evoai:training-calendar:${user?.id ?? "anonymous"}`;
  const [calendarCursor, setCalendarCursor] = useState(
    () => new Date(today.getFullYear(), today.getMonth(), 1),
  );
  const [selectedDate, setSelectedDate] = useState(todayKey);
  const [viewMode, setViewMode] = useState<"monthly" | "weekly">("monthly");
  const [entries, setEntries] = useState<TrainingCalendarEntry[]>(
    () => loadCalendarEntries(storageKey),
  );
  const [syncState, setSyncState] = useState<CalendarSyncState>("loading");
  const [planningProfile, setPlanningProfile] = useState<PlanningProfile>({ goal: "general_fitness", trainingFocus: ["full_body"], displayName: null });
  const [lastCompletedLabel, setLastCompletedLabel] = useState<string | null>(null);
  const [workouts, setWorkouts] = useState<WorkoutSummary[]>([]);

  useEffect(() => {
    const localEntries = loadCalendarEntries(storageKey);
    setEntries(localEntries);

    if (!user) return;
    let active = true;
    setSyncState("loading");
    void loadSyncedCalendar(user.id, localEntries).then((result) => {
      if (!active) return;
      setEntries(result.entries);
      setSyncState(result.state);
    });

    const retry = () => {
      setSyncState("pending");
      void flushCalendarOutbox(user.id)
        .then(() => setSyncState("synced"))
        .catch(() => setSyncState("error"));
    };
    window.addEventListener("online", retry);

    return () => {
      active = false;
      window.removeEventListener("online", retry);
    };
  }, [storageKey, user]);

  useEffect(() => {
    if (!user) return;
    const weekStart = toDateKey(getWeekStart(fromDateKey(selectedDate)));
    const weekEnd = toDateKey(addDays(fromDateKey(weekStart), 6));
    void Promise.all([loadPlanningProfile(user.id), loadLastCompletedWorkoutLabel(user.id, weekStart), loadWorkouts(user.id, weekStart, weekEnd)])
      .then(([profile, lastLabel, weekWorkouts]) => {
        setPlanningProfile(profile); setLastCompletedLabel(lastLabel); setWorkouts(weekWorkouts);
      })
      .catch(() => { setPlanningProfile({ goal: "general_fitness", trainingFocus: ["full_body"], displayName: null }); setLastCompletedLabel(null); });
  }, [selectedDate, user]);

  useEffect(() => {
    saveCalendarEntries(storageKey, entries);
  }, [entries, storageKey]);

  const monthDays = useMemo(() => getMonthGrid(calendarCursor), [calendarCursor]);
  const weekDates = useMemo(() => getWeekDates(fromDateKey(selectedDate)), [selectedDate]);
  const calendarDays = viewMode === "weekly"
    ? weekDates.map((dateKey) => fromDateKey(dateKey))
    : monthDays;
  const calendarTitle = viewMode === "weekly"
    ? formatWeekRange(fromDateKey(weekDates[0]))
    : formatMonth(calendarCursor);
  const selectedEntry = entries.find((entry) => entry.date === selectedDate);
  const effectiveEntries = useMemo(() => {
    const byDate = new Map(entries.map((entry) => [entry.date, entry]));
    workouts.filter((workout) => workout.status === "completed").forEach((workout) => {
      const entry = byDate.get(workout.date);
      byDate.set(workout.date, {
        date: workout.date, available: entry?.available ?? false, completed: true,
        completedWasPlanned: entry?.completedWasPlanned, completedLabel: workout.label,
      });
    });
    return [...byDate.values()];
  }, [entries, workouts]);
  const weeklyPlan = useMemo(
    () => buildWeeklyPlan(effectiveEntries, fromDateKey(selectedDate), {
      ...planningProfile,
      lastCompletedLabel,
      existingWorkouts: workouts,
    }),
    [effectiveEntries, lastCompletedLabel, planningProfile, selectedDate, workouts],
  );
  const nextSequenceLabel = workouts.find((workout) => workout.date === selectedDate)?.label
    ?? weeklyPlan.days.find((day) => day.status === "planned")?.label;
  const workoutHref = (date: string, label: string, planned: boolean) => {
    return `#/preparar-treino/${date}?label=${encodeURIComponent(label)}&planned=${planned ? "1" : "0"}`;
  };

  function updateEntry(date: string, update: (entry: TrainingCalendarEntry) => TrainingCalendarEntry) {
    const existing = entries.find((entry) => entry.date === date) ?? {
      date,
      available: false,
      completed: false,
    };
    const nextEntry = update(existing);
    const remaining = entries.filter((entry) => entry.date !== date);
    const persistedEntry = !nextEntry.available && !nextEntry.completed ? null : nextEntry;

    setEntries(persistedEntry
      ? [...remaining, persistedEntry].sort((left, right) => left.date.localeCompare(right.date))
      : remaining);

    if (user) {
      setSyncState("pending");
      void queueCalendarMutation(user.id, date, persistedEntry).then(setSyncState);
    }
  }

  function toggleAvailability() {
    updateEntry(selectedDate, (entry) => ({ ...entry, available: !entry.available }));
  }

  function toggleCompleted() {
    updateEntry(selectedDate, (entry) => entry.completed
      ? { ...entry, completed: false, completedWasPlanned: undefined }
      : { ...entry, completed: true, completedWasPlanned: entry.available });
  }

  const displayName = String(planningProfile.displayName ?? user?.user_metadata?.full_name ?? user?.email?.split("@")[0] ?? "Atleta")
    .split(/[._-]/)
    .map((part) => part ? `${part[0].toUpperCase()}${part.slice(1)}` : "")
    .filter(Boolean)
    .join(" ");
  const nextWorkout = weeklyPlan.days.find((day) => day.status === "planned");
  const plannedMuscleVolume = useMemo(
    () => summarizePlannedMuscleVolume(weeklyPlan.days.map((day) => day.label)),
    [weeklyPlan.days],
  );
  const weeklyProgress = weeklyPlan.targetSessions > 0
    ? Math.round((weeklyPlan.completedSessions / weeklyPlan.targetSessions) * 100)
    : 0;
  const focusLabels: Record<string, string> = {
    full_body: "Corpo inteiro",
    glutes: "Glúteos",
    legs: "Pernas",
    upper_body: "Membros superiores",
    chest: "Peito",
    back: "Costas",
    shoulders: "Ombros",
    arms: "Braços",
    core: "Core",
  };

  return (
    <main className="training-dashboard">
        <section className="dashboard-welcome" aria-labelledby="dashboard-title">
          <div>
            <span className="eyebrow">PAINEL DE TREINO</span>
            <h1 id="dashboard-title">Bem-vindo, {displayName}!</h1>
            <p>Seu planejamento acompanha sua disponibilidade e preserva tudo o que você já realizou.</p>
          </div>
          <div className={`calendar-sync calendar-sync--${syncState}`} role="status" aria-live="polite">
            <span aria-hidden="true" />
            {syncState === "loading" && "Carregando calendário…"}
            {syncState === "synced" && "Calendário sincronizado"}
            {syncState === "pending" && "Salvando alterações…"}
            {syncState === "offline" && "Alterações salvas neste dispositivo"}
            {syncState === "error" && "Sincronização pendente"}
          </div>
        </section>

        <section className="dashboard-overview" aria-label="Resumo da semana">
          <article className="overview-card overview-card--primary">
            <span>PRÓXIMO TREINO</span>
            <strong>{nextWorkout?.label ?? "Defina sua disponibilidade"}</strong>
            <small>{nextWorkout ? formatShortDate(nextWorkout.date) : "Marque os dias no calendário para começar"}</small>
            {nextWorkout && <a href={workoutHref(nextWorkout.date, nextWorkout.label, true)}>Preparar treino <b aria-hidden="true">→</b></a>}
          </article>
          <article className="overview-card">
            <span>PROGRESSO SEMANAL</span>
            <div className="overview-card__metric"><strong>{weeklyPlan.completedSessions}</strong><small>de {weeklyPlan.targetSessions} treinos</small></div>
            <div className="overview-progress" aria-label={`${weeklyProgress}% da semana concluída`}><i style={{ width: `${weeklyProgress}%` }} /></div>
            <small>{weeklyProgress}% concluído</small>
          </article>
          <article className="overview-card">
            <span>FOCO MUSCULAR</span>
            <div className="focus-tags">
              {planningProfile.trainingFocus.map((focus) => <strong key={focus}>{focusLabels[focus] ?? focus}</strong>)}
            </div>
            <a href="#/perfil">Ajustar foco <b aria-hidden="true">→</b></a>
          </article>
        </section>

        <section className="calendar-hero">
          <span className="eyebrow">PLANEJAMENTO ADAPTATIVO</span>
          <h2>Quando você pode treinar?</h2>
          <p>Marque sua disponibilidade. O EvoAI monta a semana pelas datas escolhidas e reorganiza o restante quando um treino acontece fora do plano.</p>
        </section>

        <div className="planner-layout" id="training-calendar">
          <section className="calendar-card" aria-labelledby="calendar-title">
            <div className="calendar-card__header">
              <div>
                <span className="section-kicker">CALENDÁRIO</span>
                <h2 id="calendar-title">{calendarTitle}</h2>
              </div>
              <div className="calendar-view-toggle" role="tablist" aria-label="Selecionar visualização do calendário">
                <button
                  type="button"
                  role="tab"
                  aria-selected={viewMode === "weekly"}
                  className={`calendar-view-toggle__button${viewMode === "weekly" ? " calendar-view-toggle__button--active" : ""}`}
                  data-testid="view-toggle-weekly"
                  onClick={() => setViewMode("weekly")}
                >Semanal</button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={viewMode === "monthly"}
                  className={`calendar-view-toggle__button${viewMode === "monthly" ? " calendar-view-toggle__button--active" : ""}`}
                  data-testid="view-toggle-monthly"
                  onClick={() => {
                    setViewMode("monthly");
                    setCalendarCursor(new Date(fromDateKey(selectedDate).getFullYear(), fromDateKey(selectedDate).getMonth(), 1));
                  }}
                >Mensal</button>
              </div>
              <div className="calendar-navigation" aria-label={viewMode === "weekly" ? "Navegar entre semanas" : "Navegar entre meses"}>
                <button
                  type="button"
                  aria-label={viewMode === "weekly" ? "Semana anterior" : "Mês anterior"}
                  onClick={() => {
                    if (viewMode === "weekly") {
                      const previousWeek = addDays(fromDateKey(selectedDate), -7);
                      setSelectedDate(toDateKey(previousWeek));
                      setCalendarCursor(new Date(previousWeek.getFullYear(), previousWeek.getMonth(), 1));
                    } else {
                      setCalendarCursor((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1));
                    }
                  }}
                >←</button>
                <button
                  type="button"
                  onClick={() => {
                    setCalendarCursor(new Date(today.getFullYear(), today.getMonth(), 1));
                    setSelectedDate(todayKey);
                  }}
                >Hoje</button>
                <button
                  type="button"
                  aria-label={viewMode === "weekly" ? "Próxima semana" : "Próximo mês"}
                  onClick={() => {
                    if (viewMode === "weekly") {
                      const nextWeek = addDays(fromDateKey(selectedDate), 7);
                      setSelectedDate(toDateKey(nextWeek));
                      setCalendarCursor(new Date(nextWeek.getFullYear(), nextWeek.getMonth(), 1));
                    } else {
                      setCalendarCursor((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1));
                    }
                  }}
                >→</button>
              </div>
            </div>

            <div className="calendar-weekdays" aria-hidden="true">
              {WEEK_DAYS.map((day) => <span key={day}>{day}</span>)}
            </div>

            <div className="calendar-grid" data-testid="calendar-grid">
              {calendarDays.map((date) => {
                const dateKey = toDateKey(date);
                const entry = entries.find((item) => item.date === dateKey);
                const outsideMonth = viewMode === "monthly" && date.getMonth() !== calendarCursor.getMonth();
                const classNames = [
                  "calendar-day",
                  outsideMonth ? "calendar-day--outside" : "",
                  dateKey === todayKey ? "calendar-day--today" : "",
                  dateKey === selectedDate ? "calendar-day--selected" : "",
                  entry?.available ? "calendar-day--available" : "",
                  entry?.completed ? "calendar-day--completed" : "",
                ].filter(Boolean).join(" ");

                return (
                  <button
                    className={classNames}
                    type="button"
                    key={dateKey}
                    aria-label={formatFullDate(dateKey)}
                    aria-pressed={dateKey === selectedDate}
                    onClick={() => setSelectedDate(dateKey)}
                  >
                    <span>{date.getDate()}</span>
                    {entry?.completed
                      ? <small>Feito</small>
                      : entry?.available && <small>Disponível</small>}
                  </button>
                );
              })}
            </div>

            <div className="selected-day-panel">
              <div>
                <span className="section-kicker">DATA SELECIONADA</span>
                <h3>{formatFullDate(selectedDate)}</h3>
              </div>
              <div className="selected-day-actions">
                <button
                  className={selectedEntry?.available ? "choice-button choice-button--active" : "choice-button"}
                  type="button"
                  onClick={toggleAvailability}
                >{selectedEntry?.available ? "✓ Disponível" : "+ Marcar disponibilidade"}</button>
                <button
                  className={selectedEntry?.completed ? "choice-button choice-button--completed" : "choice-button"}
                  type="button"
                  onClick={toggleCompleted}
                >{selectedEntry?.completed ? "✓ Treino realizado" : "+ Registrar treino realizado"}</button>
                {!effectiveEntries.find((entry) => entry.date === selectedDate)?.completed && nextSequenceLabel && (
                  <a className="choice-button" href={workoutHref(selectedDate, nextSequenceLabel, weeklyPlan.days.some((day) => day.date === selectedDate && day.status === "planned"))}>
                    {workouts.some((workout) => workout.date === selectedDate) ? "Revisar ou continuar" : "Preparar sessão"}
                  </a>
                )}
              </div>
            </div>
          </section>

          <aside className="week-plan" aria-labelledby="week-plan-title">
            <span className="section-kicker">SEMANA SELECIONADA</span>
            <h2 id="week-plan-title">Semana de {formatShortDate(weeklyPlan.weekStart)}</h2>
            <div className="week-plan__metrics">
              <div><strong>{weeklyPlan.targetSessions}</strong><span>treinos na semana</span></div>
              <div><strong>{weeklyPlan.completedSessions}</strong><span>já realizados</span></div>
            </div>
            <p className="week-plan__message">{weeklyPlan.message}</p>
            <a className="week-plan__settings" href="#/perfil">Ajustar objetivo e foco do treino</a>

            <div className="week-plan__days">
              {weeklyPlan.days.length === 0 && (
                <div className="week-plan__empty">Selecione no calendário os dias em que estará disponível.</div>
              )}
              {weeklyPlan.days.map((day) => (
                <article className={`planned-day planned-day--${day.status}`} key={`${day.date}-${day.label}`}>
                  <span className="planned-day__marker" aria-hidden="true">{day.status === "completed" ? "✓" : ""}</span>
                  <div>
                    <small>{formatShortDate(day.date)}</small>
                    <strong>{day.label}</strong>
                    {day.adjusted && <em>Semana reajustada</em>}
                  </div>
                  {day.status === "planned" && <a className="open-workout" href={workoutHref(day.date, day.label, true)}>{workouts.some((workout) => workout.date === day.date) ? "Revisar ficha" : "Montar treino"}</a>}
                </article>
              ))}
            </div>

            {plannedMuscleVolume.length > 0 && (
              <section className="muscle-volume-preview" aria-labelledby="muscle-volume-title">
                <div>
                  <span className="section-kicker">COBERTURA MUSCULAR</span>
                  <h3 id="muscle-volume-title">Séries previstas</h3>
                </div>
                <div className="muscle-volume-preview__grid">
                  {plannedMuscleVolume.map((item) => (
                    <span key={item.muscle}>
                      <strong>{MUSCLE_LABELS[item.muscle]}</strong>
                      <small>{item.totalSets.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} séries</small>
                    </span>
                  ))}
                </div>
                <p>Séries compostas incluem contribuição parcial dos músculos auxiliares.</p>
              </section>
            )}

            <div className="week-plan__legend">
              <span><i className="legend-dot legend-dot--available" />Disponível</span>
              <span><i className="legend-dot legend-dot--completed" />Realizado</span>
            </div>
          </aside>
        </div>

        <section className="planning-note">
          <strong>Como o ajuste funciona</strong>
          <p>Um treino realizado em dia não marcado assume a próxima sessão da sequência. O sistema mantém o que já foi feito e redistribui somente os treinos restantes, sem alterar o histórico.</p>
        </section>
    </main>
  );
}
