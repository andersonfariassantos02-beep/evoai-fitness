import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { getAuthErrorMessage } from "../lib/authErrors";
import {
  addDays,
  buildWeeklyPlan,
  fromDateKey,
  getMonthGrid,
  loadCalendarEntries,
  saveCalendarEntries,
  toDateKey,
  type TrainingCalendarEntry,
} from "../lib/trainingCalendar";
import {
  flushCalendarOutbox,
  loadSyncedCalendar,
  queueCalendarMutation,
  type CalendarSyncState,
} from "../services/trainingCalendarService";

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

export default function DashboardPage() {
  const { user, signOut } = useAuth();
  const today = useMemo(() => new Date(), []);
  const todayKey = toDateKey(today);
  const storageKey = `evoai:training-calendar:${user?.id ?? "anonymous"}`;
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [calendarCursor, setCalendarCursor] = useState(
    () => new Date(today.getFullYear(), today.getMonth(), 1),
  );
  const [selectedDate, setSelectedDate] = useState(todayKey);
  const [entries, setEntries] = useState<TrainingCalendarEntry[]>(
    () => loadCalendarEntries(storageKey),
  );
  const [syncState, setSyncState] = useState<CalendarSyncState>("loading");

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
    saveCalendarEntries(storageKey, entries);
  }, [entries, storageKey]);

  const monthDays = useMemo(() => getMonthGrid(calendarCursor), [calendarCursor]);
  const selectedEntry = entries.find((entry) => entry.date === selectedDate);
  const weeklyPlan = useMemo(
    () => buildWeeklyPlan(entries, fromDateKey(selectedDate)),
    [entries, selectedDate],
  );

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

  async function handleSignOut() {
    setError("");
    setSubmitting(true);

    try {
      await signOut();
    } catch (caughtError) {
      setError(getAuthErrorMessage(caughtError));
      setSubmitting(false);
    }
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <a className="brand" href="#/app" aria-label="EvoAI Fitness — início">
          <span className="brand__mark" aria-hidden="true">E</span>
          <span><strong>EvoAI</strong><small>Fitness</small></span>
        </a>
        <div className="header-actions"><a className="secondary-button" href="#/perfil">Meu perfil</a><button className="secondary-button" type="button" onClick={handleSignOut} disabled={submitting}>
          {submitting ? "Saindo…" : "Sair"}
        </button></div>
      </header>

      <main className="training-dashboard">
        {error && <div className="form-message form-message--error" role="alert">{error}</div>}

        <section className="calendar-hero" aria-labelledby="dashboard-title">
          <div>
            <span className="eyebrow">PLANEJAMENTO ADAPTATIVO</span>
            <h1 id="dashboard-title">Quando você pode treinar?</h1>
            <p>Marque sua disponibilidade. O EvoAI monta a semana pelas datas escolhidas e reorganiza o restante quando um treino acontece fora do plano.</p>
          </div>
          <div className="calendar-hero__rule">
            <strong>Nenhuma escala é presumida</strong>
            <span>O planejamento considera somente o que você marcar no calendário.</span>
          </div>
        </section>

        <div className={`calendar-sync calendar-sync--${syncState}`} role="status" aria-live="polite">
          <span aria-hidden="true" />
          {syncState === "loading" && "Carregando calendário…"}
          {syncState === "synced" && "Calendário sincronizado"}
          {syncState === "pending" && "Salvando alterações…"}
          {syncState === "offline" && "Sem conexão — alterações preservadas neste dispositivo"}
          {syncState === "error" && "Sincronização pendente — tentaremos novamente quando houver conexão"}
        </div>

        <div className="planner-layout">
          <section className="calendar-card" aria-labelledby="calendar-title">
            <div className="calendar-card__header">
              <div>
                <span className="section-kicker">CALENDÁRIO</span>
                <h2 id="calendar-title">{formatMonth(calendarCursor)}</h2>
              </div>
              <div className="calendar-navigation" aria-label="Navegar entre meses">
                <button
                  type="button"
                  aria-label="Mês anterior"
                  onClick={() => setCalendarCursor((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))}
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
                  aria-label="Próximo mês"
                  onClick={() => setCalendarCursor((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))}
                >→</button>
              </div>
            </div>

            <div className="calendar-weekdays" aria-hidden="true">
              {WEEK_DAYS.map((day) => <span key={day}>{day}</span>)}
            </div>

            <div className="calendar-grid">
              {monthDays.map((date) => {
                const dateKey = toDateKey(date);
                const entry = entries.find((item) => item.date === dateKey);
                const outsideMonth = date.getMonth() !== calendarCursor.getMonth();
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
                  {day.status === "planned" && <a className="open-workout" href={`#/treino/${day.date}?label=${encodeURIComponent(day.label)}`}>Abrir treino</a>}
                </article>
              ))}
            </div>

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

      <footer className="app-footer"><span>EvoAI Fitness</span><span>Calendário adaptativo • P0</span></footer>
    </div>
  );
}
