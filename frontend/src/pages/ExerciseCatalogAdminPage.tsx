import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import {
  groupExerciseCatalogByMuscle,
  isExerciseCatalogAdmin,
  loadExerciseCatalogAdmin,
  saveExerciseCatalogItem,
  setExerciseCatalogItemActive,
  type ExerciseCatalogAdminItem,
} from "../services/exerciseCatalogService";

const MUSCLES = [
  ["peito", "Peito"],
  ["costas", "Costas"],
  ["ombros", "Ombros"],
  ["quadriceps", "Quadríceps"],
  ["posteriores", "Posteriores de coxa"],
  ["gluteos", "Glúteos"],
  ["panturrilhas", "Panturrilhas"],
  ["biceps", "Bíceps"],
  ["triceps", "Tríceps"],
  ["core", "Core"],
] as const;

function emptyExercise(muscle = ""): ExerciseCatalogAdminItem {
  return {
    key: "",
    name: "",
    default_sets: 3,
    reps_min: 8,
    reps_max: 12,
    muscle,
    movement: "",
    equipment: "",
    avoid_when: [],
    instructions: "",
    cautions: [],
    media_url: null,
    equipment_variants: [],
    muscle_region: "",
    secondary_muscles: [],
    mechanics: "composto",
    laterality: "bilateral",
    resistance_profile: "variavel",
    movement_vector: "",
    systemic_demand: "moderada",
    stability_demand: "moderada",
    technical_complexity: "moderada",
    exercise_family: "",
    active: true,
  };
}

function slugify(value: string) {
  return value.normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function ExerciseCatalogAdminPage() {
  const { user } = useAuth();
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [items, setItems] = useState<ExerciseCatalogAdminItem[]>([]);
  const [activeMuscle, setActiveMuscle] = useState("");
  const [form, setForm] = useState<ExerciseCatalogAdminItem>(() => emptyExercise());
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [keyEdited, setKeyEdited] = useState(false);
  const [message, setMessage] = useState("");
  const groups = useMemo(() => groupExerciseCatalogByMuscle(items), [items]);
  const selectedGroup = groups.find((group) => group.muscle === activeMuscle);

  async function refresh() {
    const nextItems = await loadExerciseCatalogAdmin();
    setItems(nextItems);
    const nextGroups = groupExerciseCatalogByMuscle(nextItems);
    setActiveMuscle((current) =>
      nextGroups.some((group) => group.muscle === current) ? current : ""
    );
  }

  useEffect(() => {
    if (!user) return;
    void isExerciseCatalogAdmin(user.id).then(async (ok) => {
      setAllowed(ok);
      if (ok) await refresh();
    });
  }, [user]);

  function openNewExercise() {
    setForm(emptyExercise(activeMuscle));
    setEditing(false);
    setKeyEdited(false);
    setMessage("");
    setEditorOpen(true);
  }

  function openEditExercise(item: ExerciseCatalogAdminItem) {
    setForm(item);
    setEditing(true);
    setKeyEdited(true);
    setMessage("");
    setEditorOpen(true);
  }

  function closeEditor() {
    setEditorOpen(false);
    setForm(emptyExercise(activeMuscle));
    setEditing(false);
    setKeyEdited(false);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setMessage("");
    try {
      await saveExerciseCatalogItem({ ...form, avoid_when: form.avoid_when.filter(Boolean) });
      await refresh();
      closeEditor();
      setMessage(editing ? "Alterações salvas." : "Exercício incluído no catálogo.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível salvar.");
    }
  }

  if (allowed === null) {
    return <main className="centered-screen"><span className="spinner" /><p>Verificando acesso…</p></main>;
  }
  if (!allowed) {
    return <main className="centered-screen"><section className="notice-card"><p className="eyebrow">ACESSO RESTRITO</p><h1>Administração não autorizada.</h1><Link to="/app">Voltar ao calendário</Link></section></main>;
  }

  return <main className="admin-shell catalog-admin-page">
    <header className="profile-header catalog-admin-header">
      <Link to="/app">← Calendário</Link>
      <div>
        <span className="eyebrow">ADMINISTRAÇÃO</span>
        <h1>Banco Mestre de Exercícios</h1>
        <p>Selecione um grupo muscular para consultar, editar ou incluir exercícios.</p>
      </div>
      <button className="catalog-new-button" type="button" onClick={openNewExercise}>+ Novo exercício</button>
    </header>

    {message && <p className="profile-message" role="status">{message}</p>}

    <section className="profile-card admin-catalog catalog-browser" aria-labelledby="catalog-title">
      <div className="catalog-browser__title">
        <div><span className="eyebrow">CATÁLOGO</span><h2 id="catalog-title">{items.length} exercícios cadastrados</h2></div>
        <span>Escolha o músculo</span>
      </div>

      <div className="catalog-browser__body">
        <div className="catalog-results">
          {selectedGroup ? (
            <section className="catalog-selected-group">
              <header>
                <div><span>GRUPO MUSCULAR</span><h3>{selectedGroup.label}</h3></div>
                <strong>{selectedGroup.items.length} exercício{selectedGroup.items.length === 1 ? "" : "s"}</strong>
              </header>
              <div className="catalog-exercise-list">
                {selectedGroup.items.map((item) => (
                  <article className={`admin-item ${item.active ? "" : "admin-item--inactive"}`} key={item.key}>
                    <div>
                      <strong>{item.name}</strong>
                      <small>{item.equipment} · {item.mechanics === "isometrico" ? "isométrico" : item.mechanics}</small>
                      <small>{item.muscle_region || item.movement_vector || item.movement}</small>
                      <small>{item.instructions ? "Orientação cadastrada" : "Orientação pendente"}{item.media_url ? " · mídia vinculada" : ""}</small>
                    </div>
                    <div>
                      <button type="button" onClick={() => openEditExercise(item)}>Editar</button>
                      <button type="button" onClick={async () => {
                        await setExerciseCatalogItemActive(item.key, !item.active);
                        await refresh();
                      }}>{item.active ? "Desativar" : "Ativar"}</button>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ) : <div className="catalog-selection-empty"><strong>Selecione um grupo muscular</strong><span>Os exercícios cadastrados aparecerão aqui.</span></div>}
        </div>

        <aside className="catalog-muscle-panel">
          <h3>Grupos musculares</h3>
          <div className="catalog-muscle-tabs" role="tablist" aria-label="Grupos musculares">
            {groups.map((group) => (
              <button
                type="button"
                role="tab"
                aria-label={`${group.label}, ${group.items.length} exercício${group.items.length === 1 ? "" : "s"}`}
                aria-selected={selectedGroup?.muscle === group.muscle}
                className={selectedGroup?.muscle === group.muscle ? "active" : ""}
                key={group.muscle}
                onClick={() => setActiveMuscle((current) => current === group.muscle ? "" : group.muscle)}
              >
                {group.label}<span>{group.items.length}</span>
              </button>
            ))}
          </div>
        </aside>
      </div>
    </section>

    {editorOpen && <div className="catalog-editor-backdrop" role="presentation">
      <section className="catalog-editor" role="dialog" aria-modal="true" aria-labelledby="catalog-editor-title">
        <header>
          <div>
            <span className="eyebrow">{editing ? "EDIÇÃO" : "NOVO CADASTRO"}</span>
            <h2 id="catalog-editor-title">{editing ? `Editando: ${form.name}` : "Novo exercício"}</h2>
          </div>
          <button type="button" aria-label="Fechar" onClick={closeEditor}>×</button>
        </header>

        <form onSubmit={submit}>
          <label>Nome do exercício<input required value={form.name} onChange={(event) => {
            const name = event.target.value;
            setForm((current) => ({ ...current, name, key: keyEdited ? current.key : slugify(name) }));
          }} /></label>
          <label>Grupo muscular<select required value={form.muscle} onChange={(event) => setForm({ ...form, muscle: event.target.value })}>
            <option value="">Selecione</option>
            {MUSCLES.map(([value, label]) => <option value={value} key={value}>{label}</option>)}
          </select></label>
          <label>Região muscular<input value={form.muscle_region} onChange={(event) => setForm({ ...form, muscle_region: event.target.value })} placeholder="Ex.: fibras claviculares" /></label>
          <label>Padrão de movimento<input required value={form.movement} onChange={(event) => setForm({ ...form, movement: event.target.value })} placeholder="Ex.: empurrar-horizontal" /></label>
          <label>Vetor do movimento<input required value={form.movement_vector} onChange={(event) => setForm({ ...form, movement_vector: event.target.value })} placeholder="Ex.: empurrar diagonal convergente" /></label>
          <label>Equipamento<input required value={form.equipment} onChange={(event) => setForm({ ...form, equipment: event.target.value })} placeholder="Ex.: máquina, halteres ou cabo" /></label>

          <div className="admin-numbers catalog-taxonomy-grid">
            <label>Mecânica<select value={form.mechanics} onChange={(event) => setForm({ ...form, mechanics: event.target.value as ExerciseCatalogAdminItem["mechanics"] })}>
              <option value="composto">Composto</option><option value="isolado">Isolado</option><option value="isometrico">Isométrico</option>
            </select></label>
            <label>Lateralidade<select value={form.laterality} onChange={(event) => setForm({ ...form, laterality: event.target.value as ExerciseCatalogAdminItem["laterality"] })}>
              <option value="bilateral">Bilateral</option><option value="unilateral">Unilateral</option><option value="alternado">Alternado</option>
            </select></label>
            <label>Perfil de resistência<select value={form.resistance_profile} onChange={(event) => setForm({ ...form, resistance_profile: event.target.value as ExerciseCatalogAdminItem["resistance_profile"] })}>
              <option value="alongada">Maior na posição alongada</option><option value="intermediaria">Maior na posição intermediária</option>
              <option value="encurtada">Maior na posição encurtada</option><option value="continua">Tensão contínua</option>
              <option value="variavel">Variável</option><option value="dependente-da-maquina">Dependente da máquina</option>
            </select></label>
          </div>

          <div className="admin-numbers catalog-taxonomy-grid">
            <label>Demanda sistêmica<select value={form.systemic_demand} onChange={(event) => setForm({ ...form, systemic_demand: event.target.value as ExerciseCatalogAdminItem["systemic_demand"] })}>
              <option value="baixa">Baixa</option><option value="moderada">Moderada</option><option value="alta">Alta</option>
            </select></label>
            <label>Demanda de estabilidade<select value={form.stability_demand} onChange={(event) => setForm({ ...form, stability_demand: event.target.value as ExerciseCatalogAdminItem["stability_demand"] })}>
              <option value="baixa">Baixa</option><option value="moderada">Moderada</option><option value="alta">Alta</option>
            </select></label>
            <label>Complexidade técnica<select value={form.technical_complexity} onChange={(event) => setForm({ ...form, technical_complexity: event.target.value as ExerciseCatalogAdminItem["technical_complexity"] })}>
              <option value="baixa">Baixa</option><option value="moderada">Moderada</option><option value="alta">Alta</option>
            </select></label>
          </div>

          <details className="catalog-advanced-fields">
            <summary>Orientações e dados avançados</summary>
            <label>Identificador técnico<input required readOnly={editing} value={form.key} onChange={(event) => { setKeyEdited(true); setForm({ ...form, key: event.target.value }); }} /></label>
            <label>Família do exercício<input value={form.exercise_family} onChange={(event) => setForm({ ...form, exercise_family: event.target.value })} placeholder="Ex.: supino-inclinado" /></label>
            <label>Músculos secundários <small>(separados por vírgulas)</small><input value={form.secondary_muscles.join(", ")} onChange={(event) => setForm({ ...form, secondary_muscles: event.target.value.split(",").map((value) => value.trim()).filter(Boolean) })} /></label>
            <label>Evitar quando <small>(separado por vírgulas)</small><input value={form.avoid_when.join(", ")} onChange={(event) => setForm({ ...form, avoid_when: event.target.value.split(",").map((value) => value.trim()) })} /></label>
            <label>Instruções técnicas<textarea value={form.instructions} onChange={(event) => setForm({ ...form, instructions: event.target.value })} placeholder="Passos claros para executar o movimento" /></label>
            <label>Pontos de atenção <small>(separados por vírgulas)</small><input value={form.cautions.join(", ")} onChange={(event) => setForm({ ...form, cautions: event.target.value.split(",").map((value) => value.trim()) })} /></label>
            <label>Variações de equipamento <small>(separadas por vírgulas)</small><input value={form.equipment_variants.join(", ")} onChange={(event) => setForm({ ...form, equipment_variants: event.target.value.split(",").map((value) => value.trim()) })} /></label>
            <label>Link HTTPS da demonstração<input type="url" value={form.media_url ?? ""} onChange={(event) => setForm({ ...form, media_url: event.target.value || null })} placeholder="https://…" /></label>
          </details>

          <footer>
            <button type="button" onClick={closeEditor}>Cancelar</button>
            <button className="primary-action" type="submit">{editing ? "Salvar alterações" : "Incluir exercício"}</button>
          </footer>
        </form>
      </section>
    </div>}
  </main>;
}
