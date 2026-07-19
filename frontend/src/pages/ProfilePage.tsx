import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import {
  createProfileRestriction,
  deleteProfileRestriction,
  loadManagedProfile,
  setProfileRestrictionActive,
  updateManagedProfile,
  validateRestrictionInput,
  type ManagedProfile,
  type RestrictionInput,
} from "../services/profileRestrictionService";

const EMPTY_RESTRICTION: RestrictionInput = { category: "injury", severity: "avoid", description: "", starts_on: "", ends_on: "" };
const CATEGORY = { medical: "Condição de saúde", injury: "Lesão ou desconforto", equipment: "Equipamento indisponível", preference: "Preferência", other: "Outra" };
const SEVERITY = { info: "Informativa", avoid: "Evitar", contraindication: "Não utilizar" };

export default function ProfilePage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<ManagedProfile | null>(null);
  const [name, setName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [draft, setDraft] = useState<RestrictionInput>(EMPTY_RESTRICTION);
  const [message, setMessage] = useState("Carregando perfil…");
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    if (!user) return;
    try {
      const data = await loadManagedProfile(user.id);
      setProfile(data);
      setName(data?.display_name ?? "");
      setBirthDate(data?.birth_date ?? "");
      setMessage(data ? "" : "Nenhum perfil está ligado a esta conta.");
    } catch (error) {
      setMessage(error instanceof Error && error.message === "MULTIPLE_LINKED_PROFILES" ? "Há mais de um perfil ligado à conta. Corrija a duplicidade antes de editar." : "Não foi possível carregar o perfil.");
    }
  }, [user]);

  useEffect(() => { void refresh(); }, [refresh]);

  async function saveProfile(event: FormEvent) {
    event.preventDefault();
    if (!profile) return;
    setBusy(true);
    setMessage("");
    try { await updateManagedProfile(profile.id, name, birthDate); await refresh(); setMessage("Perfil salvo."); }
    catch { setMessage("Revise o nome e tente novamente."); }
    finally { setBusy(false); }
  }

  async function addRestriction(event: FormEvent) {
    event.preventDefault();
    if (!profile || !user) return;
    const validation = validateRestrictionInput(draft);
    if (validation) { setMessage(validation); return; }
    setBusy(true);
    setMessage("");
    try { await createProfileRestriction(profile.id, user.id, draft); setDraft(EMPTY_RESTRICTION); await refresh(); setMessage("Restrição adicionada e aplicada aos próximos treinos."); }
    catch { setMessage("Não foi possível adicionar a restrição."); }
    finally { setBusy(false); }
  }

  async function toggleRestriction(id: string, active: boolean) {
    setBusy(true);
    try { await setProfileRestrictionActive(id, active); await refresh(); setMessage(active ? "Restrição ativada." : "Restrição pausada."); }
    catch { setMessage("Não foi possível alterar a restrição."); }
    finally { setBusy(false); }
  }

  async function removeRestriction(id: string) {
    if (!window.confirm("Remover esta restrição? Sessões antigas manterão o retrato histórico.")) return;
    setBusy(true);
    try { await deleteProfileRestriction(id); await refresh(); setMessage("Restrição removida."); }
    catch { setMessage("Não foi possível remover a restrição."); }
    finally { setBusy(false); }
  }

  return <div className="profile-shell">
    <header className="profile-header"><Link to="/app">← Calendário</Link><div><span className="eyebrow">PLANEJAMENTO SEGURO</span><h1>Meu perfil</h1><p>Informe somente restrições confirmadas por você ou por um profissional.</p></div></header>
    {message && <p className="profile-message" role="status">{message}</p>}
    {profile && <main className="profile-layout">
      <form className="profile-card" onSubmit={saveProfile}><h2>Dados do perfil</h2>
        <label>Nome<input value={name} maxLength={120} required onChange={(event) => setName(event.target.value)} /></label>
        <label>Data de nascimento <small>(opcional)</small><input type="date" value={birthDate} onChange={(event) => setBirthDate(event.target.value)} /></label>
        <button disabled={busy}>Salvar perfil</button>
      </form>

      <form className="profile-card profile-card--wide" onSubmit={addRestriction}><h2>Adicionar restrição</h2>
        <div className="restriction-form-grid">
          <label>Categoria<select value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value as RestrictionInput["category"] })}>{Object.entries(CATEGORY).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label>Orientação<select value={draft.severity} onChange={(event) => setDraft({ ...draft, severity: event.target.value as RestrictionInput["severity"] })}>{Object.entries(SEVERITY).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label>Início <small>(opcional)</small><input type="date" value={draft.starts_on} onChange={(event) => setDraft({ ...draft, starts_on: event.target.value })} /></label>
          <label>Fim <small>(opcional)</small><input type="date" value={draft.ends_on} onChange={(event) => setDraft({ ...draft, ends_on: event.target.value })} /></label>
        </div>
        <label>Descrição<textarea required maxLength={1000} placeholder="Ex.: evitar flexão profunda do joelho" value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} /></label>
        <p className="profile-safety-note">O EvoAI usa este texto para evitar exercícios incompatíveis. Ele não substitui avaliação médica.</p>
        <button disabled={busy}>Adicionar restrição</button>
      </form>

      <section className="profile-card profile-card--wide"><h2>Restrições cadastradas</h2>
        {!profile.restrictions.length && <p className="empty-restrictions">Nenhuma restrição cadastrada.</p>}
        <div className="restriction-list">{profile.restrictions.map((item) => <article className={item.active ? "restriction-item" : "restriction-item restriction-item--inactive"} key={item.id}>
          <div><span>{CATEGORY[item.category]} · {SEVERITY[item.severity]}</span><strong>{item.description}</strong><small>{item.starts_on || item.ends_on ? `${item.starts_on || "sem início"} até ${item.ends_on || "sem fim"}` : "Sem período definido"}</small></div>
          <div><button type="button" disabled={busy} onClick={() => void toggleRestriction(item.id, !item.active)}>{item.active ? "Pausar" : "Ativar"}</button><button className="danger-button" type="button" disabled={busy} onClick={() => void removeRestriction(item.id)}>Remover</button></div>
        </article>)}</div>
      </section>
    </main>}
  </div>;
}
