import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { isExerciseCatalogAdmin, loadExerciseCatalogAdmin, saveExerciseCatalogItem, setExerciseCatalogItemActive, type ExerciseCatalogAdminItem } from "../services/exerciseCatalogService";

const empty: ExerciseCatalogAdminItem = { key: "", name: "", default_sets: 3, reps_min: 8, reps_max: 12, muscle: "", movement: "", equipment: "", avoid_when: [], instructions: "", cautions: [], media_url: null, equipment_variants: [], active: true };

export default function ExerciseCatalogAdminPage() {
  const { user } = useAuth();
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [items, setItems] = useState<ExerciseCatalogAdminItem[]>([]);
  const [form, setForm] = useState(empty);
  const [message, setMessage] = useState("");

  async function refresh() { setItems(await loadExerciseCatalogAdmin()); }
  useEffect(() => { if (!user) return; void isExerciseCatalogAdmin(user.id).then(async ok => { setAllowed(ok); if (ok) await refresh(); }); }, [user]);

  async function submit(event: FormEvent) {
    event.preventDefault(); setMessage("");
    try { await saveExerciseCatalogItem({ ...form, avoid_when: form.avoid_when.filter(Boolean) }); await refresh(); setForm(empty); setMessage("Exercício salvo."); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Não foi possível salvar."); }
  }

  if (allowed === null) return <main className="centered-screen"><span className="spinner" /><p>Verificando acesso…</p></main>;
  if (!allowed) return <main className="centered-screen"><section className="notice-card"><p className="eyebrow">ACESSO RESTRITO</p><h1>Administração não autorizada.</h1><Link to="/app">Voltar ao calendário</Link></section></main>;

  return <main className="admin-shell">
    <header className="profile-header"><Link to="/app">← Calendário</Link><div><span className="eyebrow">ADMINISTRAÇÃO</span><h1>Banco Mestre de Exercícios</h1><p>Curadoria global com histórico preservado por ativação e desativação.</p></div></header>
    {message && <p className="profile-message" role="status">{message}</p>}
    <section className="admin-layout">
      <form className="profile-card" onSubmit={submit}><h2>Novo exercício</h2>
        {(["key","name","muscle","movement","equipment"] as const).map(field => <label key={field}>{field}<input required value={form[field]} onChange={e => setForm({ ...form, [field]: e.target.value })} /></label>)}
        <div className="admin-numbers"><label>Séries<input type="number" min="1" max="10" value={form.default_sets} onChange={e => setForm({...form, default_sets:+e.target.value})}/></label><label>Reps mín.<input type="number" min="1" value={form.reps_min} onChange={e => setForm({...form, reps_min:+e.target.value})}/></label><label>Reps máx.<input type="number" min="1" value={form.reps_max} onChange={e => setForm({...form, reps_max:+e.target.value})}/></label></div>
        <label>Evitar quando (separado por vírgulas)<input value={form.avoid_when.join(", ")} onChange={e => setForm({...form, avoid_when:e.target.value.split(",").map(v=>v.trim())})}/></label>
        <label>Instruções técnicas<textarea value={form.instructions} onChange={e => setForm({...form, instructions:e.target.value})} placeholder="Passos claros para executar o movimento"/></label>
        <label>Pontos de atenção (separados por vírgulas)<input value={form.cautions.join(", ")} onChange={e => setForm({...form, cautions:e.target.value.split(",").map(v=>v.trim())})}/></label>
        <label>Variações de equipamento (separadas por vírgulas)<input value={form.equipment_variants.join(", ")} onChange={e => setForm({...form, equipment_variants:e.target.value.split(",").map(v=>v.trim())})}/></label>
        <label>URL HTTPS da demonstração<input type="url" value={form.media_url ?? ""} onChange={e => setForm({...form, media_url:e.target.value || null})} placeholder="https://…"/></label>
        <button>Salvar exercício</button>
      </form>
      <section className="profile-card admin-catalog"><h2>Catálogo ({items.length})</h2>{items.map(item => <article className={`admin-item ${item.active ? "" : "admin-item--inactive"}`} key={item.key}><div><strong>{item.name}</strong><small>{item.key} · {item.muscle} · {item.default_sets}×{item.reps_min}–{item.reps_max}</small><small>{item.instructions ? "Orientação cadastrada" : "Orientação pendente"}{item.media_url ? " · mídia vinculada" : ""}</small></div><div><button type="button" onClick={()=>setForm(item)}>Editar</button><button type="button" onClick={async()=>{await setExerciseCatalogItemActive(item.key,!item.active); await refresh();}}>{item.active ? "Desativar" : "Ativar"}</button></div></article>)}</section>
    </section>
  </main>;
}
