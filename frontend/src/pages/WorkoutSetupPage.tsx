import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { loadExerciseCatalog, isExerciseCatalogAdmin } from "../services/exerciseCatalogService";
import { exerciseConflictsWithRestrictions, loadActiveProfileContext, type ProfileRestriction } from "../services/profileRestrictionService";
import { createManualWorkout } from "../services/workoutSessionService";
import type { WorkoutExerciseTemplate } from "../lib/workoutTemplates";

export default function WorkoutSetupPage() {
  const { user } = useAuth();
  const { date = "" } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const suggestedLabel = params.get("label") || "Meu treino";
  const planned = params.get("planned") === "1";
  const [mode, setMode] = useState<"choice" | "manual">("choice");
  const [label, setLabel] = useState(suggestedLabel);
  const [catalog, setCatalog] = useState<WorkoutExerciseTemplate[]>([]);
  const [restrictions, setRestrictions] = useState<ProfileRestriction[]>([]);
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [admin, setAdmin] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user || !date) return;
    void Promise.all([loadExerciseCatalog(), loadActiveProfileContext(user.id, date), isExerciseCatalogAdmin(user.id)])
      .then(([items, profile, isAdmin]) => { setCatalog(items); setRestrictions(profile.restrictions); setAdmin(isAdmin); })
      .catch(() => setMessage("Não foi possível carregar o catálogo de exercícios."));
  }, [date, user]);

  const available = useMemo(() => catalog.filter((item) => !exerciseConflictsWithRestrictions(item, restrictions)), [catalog, restrictions]);
  const groups = useMemo(() => {
    const result = new Map<string, WorkoutExerciseTemplate[]>();
    available.forEach((item) => result.set(item.muscle, [...(result.get(item.muscle) ?? []), item]));
    return [...result.entries()];
  }, [available]);

  const automaticHref = `/treino/${date}?label=${encodeURIComponent(suggestedLabel)}&planned=${planned ? "1" : "0"}`;

  async function createManual() {
    if (!user) return;
    const selected = selectedKeys.map((key) => available.find((item) => item.key === key)).filter(Boolean) as WorkoutExerciseTemplate[];
    if (!selected.length) { setMessage("Escolha pelo menos um exercício."); return; }
    setBusy(true);
    setMessage("");
    try {
      await createManualWorkout(user.id, date, label, selected);
      navigate(`/treino/${date}?label=${encodeURIComponent(label.trim())}&planned=${planned ? "1" : "0"}`);
    } catch (error) {
      setMessage(error instanceof Error && error.message === "WORKOUT_ALREADY_EXISTS" ? "Já existe um treino nesta data. Abra a sessão existente." : "Não foi possível criar a ficha manual. Revise as escolhas.");
      setBusy(false);
    }
  }

  return <main className="workout-setup">
    <header><Link to="/app">← Calendário</Link><div><span className="eyebrow">MONTAGEM DA FICHA</span><h1>Como deseja montar este treino?</h1><p>Você pode aceitar a sugestão do EvoAI ou criar sua própria ficha com os exercícios do catálogo.</p>{admin && <span className="admin-badge">Conta administradora</span>}</div></header>
    {message && <p className="profile-message" role="status">{message}</p>}
    {mode === "choice" ? <section className="setup-mode-grid">
      <article><h2>EvoAI monta para mim</h2><p>Usa seu objetivo, foco muscular, restrições e a sequência da semana.</p><Link className="primary-link" to={automaticHref}>Usar treino sugerido</Link></article>
      <article><h2>Quero montar manualmente</h2><p>Escolha o nome e os exercícios da ficha, inclusive os prescritos pelo seu coach.</p><button type="button" onClick={() => setMode("manual")}>Montar minha ficha</button></article>
    </section> : <section className="manual-builder">
      <div className="manual-builder__header"><div><h2>Minha ficha</h2><p>Selecione de 1 a 12 exercícios. A ordem seguirá a ordem de seleção.</p></div><button type="button" onClick={() => setMode("choice")}>Voltar</button></div>
      <label>Nome do treino<input value={label} maxLength={120} onChange={(event) => setLabel(event.target.value)} /></label>
      <div className="manual-selection"><strong>{selectedKeys.length} exercício{selectedKeys.length === 1 ? "" : "s"} selecionado{selectedKeys.length === 1 ? "" : "s"}</strong>{selectedKeys.length > 0 && <span>{selectedKeys.map((key) => available.find((item) => item.key === key)?.name).join(" → ")}</span>}</div>
      {groups.map(([muscle, items]) => <section className="manual-muscle" key={muscle}><h3>{muscle}</h3><div>{items.map((item) => { const checked = selectedKeys.includes(item.key); return <label key={item.key} className={checked ? "manual-exercise manual-exercise--selected" : "manual-exercise"}><input type="checkbox" checked={checked} disabled={!checked && selectedKeys.length >= 12} onChange={() => setSelectedKeys((current) => checked ? current.filter((key) => key !== item.key) : [...current, item.key])} /><span><strong>{item.name}</strong><small>{item.equipment} · {item.sets}×{item.repsMin}–{item.repsMax}</small></span></label>; })}</div></section>)}
      <button className="finish-workout" type="button" disabled={busy || !label.trim() || !selectedKeys.length} onClick={() => void createManual()}>{busy ? "Criando ficha…" : "Criar e abrir treino"}</button>
    </section>}
  </main>;
}
