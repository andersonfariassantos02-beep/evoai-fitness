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
import { buildMuscleVolumeBalance, MUSCLE_LABELS, summarizePlannedMuscleVolume, type MuscleVolumeSummary } from "../lib/trainingVolume";
import { loadMuscleRecovery } from "../services/muscleRecoveryService";
import type { MuscleRecovery } from "../lib/muscleRecovery";
import { loadFatigueAssessment } from "../services/fatigueService";
import type { FatigueAssessment } from "../lib/fatigueAssessment";
import { loadWeeklyMuscleVolume } from "../services/weeklyMuscleVolumeService";
import { buildMonthlyTrainingGoal, monthDateRange } from "../lib/monthlyTrainingGoal";
import { loadMonthlyCompletedWorkoutDates } from "../services/monthlyTrainingGoalService";
import { endDeload, loadActiveDeload, startDeload, type DeloadPeriod } from "../services/deloadService";

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
  const [muscleRecovery, setMuscleRecovery] = useState<MuscleRecovery[]>([]);
  const [recoveryLoading, setRecoveryLoading] = useState(true);
  const [fatigue, setFatigue] = useState<FatigueAssessment | null>(null);
  const [fatigueLoading, setFatigueLoading] = useState(true);
  const [activeDeload, setActiveDeload] = useState<DeloadPeriod | null>(null);
  const [deloadDialogOpen, setDeloadDialogOpen] = useState(false);
  const [deloadBusy, setDeloadBusy] = useState(false);
  const [deloadMessage, setDeloadMessage] = useState("");
  const [completedMuscleVolume, setCompletedMuscleVolume] = useState<MuscleVolumeSummary[]>([]);
  const [monthlyCompletedDates, setMonthlyCompletedDates] = useState<string[]>([]);
  const [monthlyGoalLoading, setMonthlyGoalLoading] = useState(true);

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
    void Promise.all([
      loadPlanningProfile(user.id),
      loadLastCompletedWorkoutLabel(user.id, weekStart),
      loadWorkouts(user.id, weekStart, weekEnd),
      loadWeeklyMuscleVolume(user.id, weekStart, weekEnd).catch(() => []),
    ])
      .then(([profile, lastLabel, weekWorkouts, weekMuscleVolume]) => {
        setPlanningProfile(profile); setLastCompletedLabel(lastLabel); setWorkouts(weekWorkouts); setCompletedMuscleVolume(weekMuscleVolume);
      })
      .catch(() => {
        setPlanningProfile({ goal: "general_fitness", trainingFocus: ["full_body"], displayName: null });
        setLastCompletedLabel(null); setCompletedMuscleVolume([]);
      });
  }, [selectedDate, user]);

  useEffect(() => {
    if (!user) return;
    let active = true;
    setRecoveryLoading(true);
    void loadMuscleRecovery(user.id)
      .then((result) => { if (active) setMuscleRecovery(result); })
      .catch(() => { if (active) setMuscleRecovery([]); })
      .finally(() => { if (active) setRecoveryLoading(false); });
    return () => { active = false; };
  }, [user]);

  useEffect(() => {
    if (!user) return;
    let active = true;
    void loadActiveDeload(user.id, todayKey)
      .then((result) => { if (active) setActiveDeload(result); })
      .catch(() => { if (active) setDeloadMessage("Não foi possível consultar a semana de deload agora."); });
    return () => { active = false; };
  }, [todayKey, user]);

  useEffect(() => {
    if (!user) return;
    let active = true;
    setFatigueLoading(true);
    void loadFatigueAssessment(user.id)
      .then((result) => { if (active) setFatigue(result); })
      .catch(() => { if (active) setFatigue(null); })
      .finally(() => { if (active) setFatigueLoading(false); });
    return () => { active = false; };
  }, [user]);

  useEffect(() => {
    if (!user) return;
    let active = true;
    const { startDate, endDate } = monthDateRange(calendarCursor);
    setMonthlyGoalLoading(true);
    void loadMonthlyCompletedWorkoutDates(user.id, startDate, endDate)
      .then((dates) => { if (active) setMonthlyCompletedDates(dates); })
      .catch(() => { if (active) setMonthlyCompletedDates([]); })
      .finally(() => { if (active) setMonthlyGoalLoading(false); });
    return () => { active = false; };
  }, [calendarCursor, user]);

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
  const muscleVolumeBalance = useMemo(
    () => buildMuscleVolumeBalance(plannedMuscleVolume, completedMuscleVolume),
    [completedMuscleVolume, plannedMuscleVolume],
  );
  const weeklyProgress = weeklyPlan.targetSessions > 0
    ? Math.round((weeklyPlan.completedSessions / weeklyPlan.targetSessions) * 100)
    : 0;
  const monthlyGoal = useMemo(() => buildMonthlyTrainingGoal(
    entries.filter((entry) => entry.available).map((entry) => entry.date),
    monthlyCompletedDates,
    calendarCursor,
    today,
  ), [calendarCursor, entries, monthlyCompletedDates, today]);
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

  async function activateDeload() {
    if (!user || !fatigue) return;
    setDeloadBusy(true);
    setDeloadMessage("");
    try {
      const period = await startDeload(user.id, todayKey, fatigue.signals.join("; "));
      setActiveDeload(period);
      setDeloadDialogOpen(false);
      setDeloadMessage("Semana de deload ativada. As sugestões automáticas usarão volume reduzido e RPE 6–7.");
    } catch {
      setDeloadMessage("Não foi possível ativar o deload. Verifique a conexão e tente novamente.");
    } finally {
      setDeloadBusy(false);
    }
  }

  async function finishDeload() {
    if (!user || !activeDeload) return;
    setDeloadBusy(true);
    setDeloadMessage("");
    try {
      await endDeload(user.id, activeDeload.id);
      setActiveDeload(null);
      setDeloadMessage("Semana de deload encerrada. O planejamento voltou ao volume normal.");
    } catch {
      setDeloadMessage("Não foi possível encerrar o deload. Verifique a conexão e tente novamente.");
    } finally {
      setDeloadBusy(false);
    }
  }

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

        <section className={`monthly-goal monthly-goal--${monthlyGoal.status}`} aria-labelledby="monthly-goal-title">
          <div className="monthly-goal__copy">
            <span className="eyebrow">META E CONSISTÊNCIA</span>
            <h2 id="monthly-goal-title">{monthlyGoalLoading ? "Calculando sua meta mensal…" : monthlyGoal.title}</h2>
            {!monthlyGoalLoading && <p>{monthlyGoal.message}</p>}
          </div>
          <div className="monthly-goal__progress">
            <div><strong>{monthlyGoal.completedSessions}</strong><span>de {monthlyGoal.targetSessions} treinos</span></div>
            <div className="overview-progress" aria-label={`${monthlyGoal.progressPercent}% da meta mensal concluída`}><i style={{ width: `${monthlyGoal.progressPercent}%` }} /></div>
            <small>A meta acompanha os dias disponíveis marcados neste mês.</small>
          </div>
        </section>

        <section className={`fatigue-card fatigue-card--${fatigue?.level ?? "normal"}`} aria-labelledby="fatigue-title">
          <div className="fatigue-card__status" aria-hidden="true" />
          <div className="fatigue-card__content">
            <span className="eyebrow">GESTÃO DE FADIGA</span>
            <h2 id="fatigue-title">{fatigueLoading ? "Analisando recuperação geral…" : fatigue?.title ?? "Análise temporariamente indisponível"}</h2>
            {!fatigueLoading && fatigue && <>
              <p>{fatigue.summary}</p>
              {fatigue.signals.length > 0 && <ul>{fatigue.signals.map((signal) => <li key={signal}>{signal}</li>)}</ul>}
              <strong>{fatigue.recommendation}</strong>
              {activeDeload && <div className="fatigue-card__deload">
                <strong>Deload ativo até {new Intl.DateTimeFormat("pt-BR").format(fromDateKey(activeDeload.endsOn))}</strong>
                <span>Volume −{activeDeload.volumeReductionPercent}% · alvo de RPE {activeDeload.targetRpeMin}–{activeDeload.targetRpeMax}</span>
                <button type="button" disabled={deloadBusy} onClick={() => void finishDeload()}>{deloadBusy ? "Encerrando…" : "Encerrar deload"}</button>
              </div>}
              {!activeDeload && fatigue.level === "deload" && <button className="fatigue-card__action" type="button" onClick={() => setDeloadDialogOpen(true)}>Preparar semana de deload</button>}
              {deloadMessage && <span className="fatigue-card__message" role="status">{deloadMessage}</span>}
            </>}
            {!fatigueLoading && !fatigue && <p>O planejamento continua disponível. Tente novamente quando a conexão estiver estável.</p>}
          </div>
          {fatigue && <div className="fatigue-card__badge">{fatigue.level === "deload" ? "DELOAD" : fatigue.level === "attention" ? "ATENÇÃO" : "NORMAL"}</div>}
        </section>

        {deloadDialogOpen && <div className="confirmation-backdrop">
          <section className="confirmation-dialog deload-dialog" role="dialog" aria-modal="true" aria-labelledby="deload-dialog-title">
            <span className="setup-status">PLANO PREVENTIVO</span>
            <h2 id="deload-dialog-title">Ativar 7 dias de deload?</h2>
            <p>De {new Intl.DateTimeFormat("pt-BR").format(fromDateKey(todayKey))} a {new Intl.DateTimeFormat("pt-BR").format(addDays(fromDateKey(todayKey), 6))}, o EvoAI irá:</p>
            <ul>
              <li>preservar exercícios e ordem da divisão semanal;</li>
              <li>reduzir aproximadamente 35% das séries nas sugestões automáticas;</li>
              <li>orientar esforço entre RPE 6 e 7;</li>
              <li>manter intactos cargas e históricos anteriores.</li>
            </ul>
            <p>Você poderá encerrar o deload a qualquer momento pelo painel.</p>
            <div className="deload-dialog__actions">
              <button type="button" disabled={deloadBusy} onClick={() => setDeloadDialogOpen(false)}>Cancelar</button>
              <button className="primary-action" type="button" disabled={deloadBusy} onClick={() => void activateDeload()}>{deloadBusy ? "Ativando…" : "Ativar deload"}</button>
            </div>
          </section>
        </div>}

        <section className="muscle-recovery" aria-labelledby="muscle-recovery-title">
          <div className="muscle-recovery__header">
            <div><span className="eyebrow">RECUPERAÇÃO ESTIMADA</span><h2 id="muscle-recovery-title">Status dos grupos musculares</h2></div>
            <div className="muscle-recovery__legend"><span className="recovering">Recuperação</span><span className="attention">Atenção</span><span className="ready">Disponível</span></div>
          </div>
          {recoveryLoading && <p className="muscle-recovery__message">Analisando seus últimos treinos…</p>}
          {!recoveryLoading && !muscleRecovery.length && <p className="muscle-recovery__message">Não foi possível calcular agora. Seu planejamento continua disponível.</p>}
          <div className="muscle-recovery__grid">
            {muscleRecovery.map((item) => <article className={`muscle-recovery__item muscle-recovery__item--${item.status}`} key={item.muscle}>
              <span aria-hidden="true" /><div><strong>{MUSCLE_LABELS[item.muscle]}</strong><small>{item.lastStimulusAt === null ? "Sem estímulo recente" : item.status === "ready" ? "Janela de recuperação concluída" : `Estimativa: ${item.remainingHours}h restantes`}</small></div>
            </article>)}
          </div>
          <p className="muscle-recovery__disclaimer">Estimativa baseada nas séries concluídas, RPE e tempo desde o último estímulo direto. Dor, sono e fadiga percebida devem prevalecer.</p>
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

            {muscleVolumeBalance.length > 0 && (
              <section className="muscle-volume-preview" aria-labelledby="muscle-volume-title">
                <div>
                  <span className="section-kicker">COBERTURA MUSCULAR</span>
                  <h3 id="muscle-volume-title">Séries da semana</h3>
                </div>
                <div className="muscle-volume-preview__grid">
                  {muscleVolumeBalance.map((item) => (
                    <span className={`muscle-volume-preview__item muscle-volume-preview__item--${item.status}`} key={item.muscle}>
                      <strong>{MUSCLE_LABELS[item.muscle]}</strong>
                      <small>{item.completedSets.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} de {item.totalSets.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} séries</small>
                      <i aria-label={`${item.progress}% concluído`}><b style={{ width: `${item.progress}%` }} /></i>
                    </span>
                  ))}
                </div>
                <p>O realizado considera séries registradas. Exercícios compostos incluem contribuição parcial dos músculos auxiliares.</p>
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
