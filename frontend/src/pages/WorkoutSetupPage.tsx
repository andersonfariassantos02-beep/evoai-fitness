import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { loadExerciseCatalog, isExerciseCatalogAdmin } from "../services/exerciseCatalogService";
import { exerciseConflictsWithRestrictions, loadActiveProfileContext, type ProfileRestriction } from "../services/profileRestrictionService";
import { cancelStartedWorkout, createManualWorkout, loadExistingWorkout, previewAutomaticWorkout, replaceUnstartedWorkout, type WorkoutSession } from "../services/workoutSessionService";
import type { WorkoutExerciseTemplate } from "../lib/workoutTemplates";

type SetupMode = "loading" | "choice" | "preview" | "manual" | "existing" | "locked" | "confirm-restart";

export default function WorkoutSetupPage() {
  const { user } = useAuth();
  const { date = "" } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const suggestedLabel = params.get("label") || "Meu treino";
  const planned = params.get("planned") === "1";
  const [mode, setMode] = useState<SetupMode>("loading");
  const [label, setLabel] = useState(suggestedLabel);
  const [catalog, setCatalog] = useState<WorkoutExerciseTemplate[]>([]);
  const [preview, setPreview] = useState<WorkoutExerciseTemplate[]>([]);
  const [existing, setExisting] = useState<WorkoutSession | null>(null);
  const [restrictions, setRestrictions] = useState<ProfileRestriction[]>([]);
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [admin, setAdmin] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user || !date) return;
    void Promise.all([loadExerciseCatalog(), loadActiveProfileContext(user.id, date), isExerciseCatalogAdmin(user.id), loadExistingWorkout(user.id, date)])
      .then(([items, profile, isAdmin, saved]) => {
        setCatalog(items); setRestrictions(profile.restrictions); setAdmin(isAdmin); setExisting(saved);
        if (saved) {
          setLabel(saved.workout_label);
          setSelectedKeys(saved.exercises.map((item) => item.exercise_key));
          setMode(saved.exercises.some((exercise) => exercise.sets.some((set) => set.completed)) || saved.status === "completed" ? "locked" : "existing");
        } else setMode("choice");
      })
      .catch(() => { setMessage("Não foi possível carregar a preparação do treino."); setMode("loading"); });
  }, [date, user]);

  const available = useMemo(() => catalog.filter((item) => !exerciseConflictsWithRestrictions(item, restrictions)), [catalog, restrictions]);
  const groups = useMemo(() => {
    const result = new Map<string, WorkoutExerciseTemplate[]>();
    available.forEach((item) => result.set(item.muscle, [...(result.get(item.muscle) ?? []), item]));
    return [...result.entries()];
  }, [available]);
  const sessionHref = `/treino/${date}?label=${encodeURIComponent(existing?.workout_label ?? (label.trim() || suggestedLabel))}&planned=${planned ? "1" : "0"}`;

  async function showAutomaticPreview() {
    if (!user) return;
    setBusy(true); setMessage("");
    try { setPreview(await previewAutomaticWorkout(user.id, date, suggestedLabel)); setLabel(suggestedLabel); setMode("preview"); }
    catch { setMessage("Não foi possível gerar a sugestão com as preferências atuais."); }
    finally { setBusy(false); }
  }

  async function persist(templates: WorkoutExerciseTemplate[]) {
    if (!user) return;
    setBusy(true); setMessage("");
    try {
      if (existing) await replaceUnstartedWorkout(user.id, date, existing.id, label, templates);
      else await createManualWorkout(user.id, date, label, templates);
      navigate(`/treino/${date}?label=${encodeURIComponent(label.trim())}&planned=${planned ? "1" : "0"}`);
    } catch (error) {
      setMessage(error instanceof Error && error.message === "WORKOUT_ALREADY_STARTED"
        ? "A ficha foi bloqueada porque o treino já começou. Continue a sessão para preservar o histórico."
        : "Não foi possível salvar a ficha. Revise as escolhas e tente novamente.");
      setBusy(false);
    }
  }

  async function restartWorkout() {
    if (!existing || existing.status === "completed") return;
    setBusy(true); setMessage("");
    try {
      await cancelStartedWorkout(existing.id);
      setExisting(null);
      setLabel(suggestedLabel);
      setSelectedKeys([]);
      setMode("choice");
      setMessage("O treino anterior foi encerrado e preservado no histórico. Agora escolha como deseja montar a nova ficha.");
    } catch {
      setMessage("Não foi possível encerrar o treino. Atualize a página e tente novamente.");
      setMode("locked");
    } finally {
      setBusy(false);
    }
  }

  function openManual(keys: string[]) { setSelectedKeys(keys); setMode("manual"); setMessage(""); }
  const selected = selectedKeys.map((key) => available.find((item) => item.key === key)).filter(Boolean) as WorkoutExerciseTemplate[];

  return <main className="workout-setup">
    <header><Link to="/app">← Calendário</Link><div><span className="eyebrow">MONTAGEM DA FICHA</span><h1>Revise antes de começar</h1><p>A ficha só é gravada depois da sua confirmação e pode ser editada enquanto nenhuma série tiver sido concluída.</p>{admin && <span className="admin-badge">Conta administradora</span>}</div></header>
    {message && <p className="profile-message" role="status">{message}</p>}

    {mode === "loading" && <section className="setup-loading" aria-live="polite"><span className="setup-loading__spinner" aria-hidden="true" /><div><h2>Carregando ficha do dia…</h2><p>Estamos verificando se já existe um treino salvo.</p></div></section>}

    {mode === "choice" && <section className="setup-mode-grid">
      <article><h2>EvoAI monta para mim</h2><p>Primeiro você verá uma prévia. Nada será salvo sem confirmação.</p><button type="button" disabled={busy} onClick={() => void showAutomaticPreview()}>{busy ? "Gerando prévia…" : "Ver sugestão"}</button></article>
      <article><h2>Quero montar manualmente</h2><p>Escolha o nome e os exercícios da ficha, inclusive os prescritos pelo seu coach.</p><button type="button" onClick={() => openManual([])}>Montar minha ficha</button></article>
    </section>}

    {mode === "preview" && <section className="setup-review"><span className="setup-status">SUGESTÃO NÃO CONFIRMADA</span><h2>{label}</h2><p>Confira a ficha. Você pode usá-la como está ou personalizar antes de salvar.</p><ol>{preview.map((item) => <li key={item.key}><strong>{item.name}</strong><span>{item.equipment} · {item.sets}×{item.repsMin}–{item.repsMax}</span></li>)}</ol><div className="setup-review__actions"><button type="button" onClick={() => setMode(existing ? "existing" : "choice")}>Voltar</button><button type="button" onClick={() => openManual(preview.map((item) => item.key))}>Personalizar</button><button className="primary-action" type="button" disabled={busy} onClick={() => void persist(preview)}>{busy ? "Salvando…" : existing ? "Substituir ficha atual" : "Confirmar e criar treino"}</button></div></section>}

    {mode === "existing" && existing && <section className="setup-review"><span className="setup-status setup-status--ready">FICHA PRONTA · AINDA NÃO INICIADA</span><h2>{existing.workout_label}</h2><p>Você ainda pode editar, trocar pela sugestão do EvoAI ou começar o treino.</p><ol>{existing.exercises.map((item) => <li key={item.id}><strong>{item.exercise_name}</strong><span>{item.sets.length} séries</span></li>)}</ol><div className="setup-review__actions"><button type="button" onClick={() => openManual(existing.exercises.map((item) => item.exercise_key))}>Editar ficha</button><button type="button" onClick={() => void showAutomaticPreview()}>Ver nova sugestão</button><Link className="primary-link" to={sessionHref}>Começar treino</Link></div></section>}

    {mode === "locked" && existing && <section className="setup-review"><span className="setup-status setup-status--locked">{existing.status === "completed" ? "TREINO CONCLUÍDO" : "TREINO EM ANDAMENTO"}</span><h2>{existing.workout_label}</h2><p>{existing.status === "completed" ? "Esta ficha faz parte do histórico e não pode mais ser alterada." : "Como uma ou mais séries já foram concluídas, a estrutura foi bloqueada para preservar seu histórico."}</p><div className="setup-review__actions"><Link className="primary-link" to={sessionHref}>{existing.status === "completed" ? "Ver treino" : "Continuar treino"}</Link>{existing.status !== "completed" && <button className="danger-link" type="button" onClick={() => setMode("confirm-restart")}>Encerrar e montar outra ficha</button>}</div></section>}

    {mode === "confirm-restart" && existing && <section className="setup-review setup-review--warning"><span className="setup-status setup-status--locked">CONFIRME O ENCERRAMENTO</span><h2>Montar uma nova ficha para este dia?</h2><p>As séries já concluídas em <strong>{existing.workout_label}</strong> continuarão no seu histórico. O treino atual será encerrado e a nova ficha começará sem séries preenchidas.</p><p>Essa ação não poderá ser desfeita.</p><div className="setup-review__actions"><button type="button" disabled={busy} onClick={() => setMode("locked")}>Voltar</button><button className="danger-action" type="button" disabled={busy} onClick={() => void restartWorkout()}>{busy ? "Encerrando…" : "Encerrar treino e montar nova ficha"}</button></div></section>}

    {mode === "manual" && <section className="manual-builder">
      <div className="manual-builder__header"><div><span className="setup-status">EDIÇÃO NÃO CONFIRMADA</span><h2>Minha ficha</h2><p>Selecione de 1 a 12 exercícios. A ordem seguirá a ordem de seleção.</p></div><button type="button" onClick={() => setMode(existing ? "existing" : "choice")}>Cancelar</button></div>
      <label>Nome do treino<input value={label} maxLength={120} onChange={(event) => setLabel(event.target.value)} /></label>
      <div className="manual-selection"><strong>{selectedKeys.length} exercício{selectedKeys.length === 1 ? "" : "s"} selecionado{selectedKeys.length === 1 ? "" : "s"}</strong>{selectedKeys.length > 0 && <span>{selected.map((item) => item.name).join(" → ")}</span>}</div>
      {groups.map(([muscle, items]) => <section className="manual-muscle" key={muscle}><h3>{muscle}</h3><div>{items.map((item) => { const checked = selectedKeys.includes(item.key); return <label key={item.key} className={checked ? "manual-exercise manual-exercise--selected" : "manual-exercise"}><input type="checkbox" checked={checked} disabled={!checked && selectedKeys.length >= 12} onChange={() => setSelectedKeys((current) => checked ? current.filter((key) => key !== item.key) : [...current, item.key])} /><span><strong>{item.name}</strong><small>{item.equipment} · {item.sets}×{item.repsMin}–{item.repsMax}</small></span></label>; })}</div></section>)}
      <button className="finish-workout" type="button" disabled={busy || !label.trim() || !selected.length} onClick={() => void persist(selected)}>{busy ? "Salvando ficha…" : existing ? "Salvar alterações" : "Confirmar e criar treino"}</button>
    </section>}
  </main>;
}
