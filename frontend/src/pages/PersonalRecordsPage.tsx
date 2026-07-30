import { useEffect, useMemo, useState } from "react";
import ExerciseEvolutionPanel from "../components/ExerciseEvolutionPanel";
import { useAuth } from "../contexts/AuthContext";
import type { ExerciseEvolution } from "../lib/exerciseEvolution";
import type { ExercisePersonalRecords } from "../lib/personalRecord";
import { loadExerciseEvolution } from "../services/exerciseEvolutionService";
import { loadPersonalRecords } from "../services/personalRecordService";

function formatDate(value: string) {
  return value.split("-").reverse().join("/");
}

function todayKey() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

export default function PersonalRecordsPage() {
  const { user } = useAuth();
  const [records, setRecords] = useState<ExercisePersonalRecords[]>([]);
  const [evolution, setEvolution] = useState<ExerciseEvolution[]>([]);
  const [selectedExerciseKey, setSelectedExerciseKey] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!user) return;
    let active = true;
    setLoading(true);
    void Promise.all([
      loadPersonalRecords(user.id),
      loadExerciseEvolution(user.id, todayKey()).catch(() => []),
    ])
      .then(([recordData, evolutionData]) => {
        if (!active) return;
        setRecords(recordData);
        setEvolution(evolutionData);
        setSelectedExerciseKey(evolutionData[0]?.key ?? "");
      })
      .catch(() => { if (active) setMessage("Não foi possível carregar seus recordes."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [user]);

  const filtered = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("pt-BR");
    return term ? records.filter((record) => record.name.toLocaleLowerCase("pt-BR").includes(term)) : records;
  }, [records, search]);
  const heaviest = [...records].sort((left, right) => right.bestLoad.loadKg - left.bestLoad.loadKg)[0];
  const strongest = [...records].sort((left, right) => right.bestEstimated1Rm.estimated1Rm - left.bestEstimated1Rm.estimated1Rm)[0];
  const highestVolume = [...records].sort((left, right) => right.bestSessionVolume.volumeKg - left.bestSessionVolume.volumeKg)[0];

  return <main className="records-page">
    <header className="records-header">
      <span className="eyebrow">DESEMPENHO MÁXIMO</span>
      <h1>Recordes pessoais</h1>
      <p>Somente séries válidas de treinos reais concluídos entram nos recordes. Aquecimentos e séries não realizadas são ignorados.</p>
    </header>

    {loading && <p className="records-message" role="status">Calculando recordes…</p>}
    {message && <p className="records-message" role="alert">{message}</p>}

    {!loading && records.length > 0 && <>
      <section className="records-summary" aria-label="Destaques dos recordes">
        <article><small>MAIOR CARGA</small><strong>{heaviest.bestLoad.loadKg.toLocaleString("pt-BR")} <i>kg</i></strong><span>{heaviest.name} · {formatDate(heaviest.bestLoad.date)}</span></article>
        <article><small>MAIOR 1RM ESTIMADA</small><strong>{strongest.bestEstimated1Rm.estimated1Rm.toLocaleString("pt-BR")} <i>kg</i></strong><span>{strongest.name} · {formatDate(strongest.bestEstimated1Rm.date)}</span></article>
        <article><small>MAIOR VOLUME</small><strong>{highestVolume.bestSessionVolume.volumeKg.toLocaleString("pt-BR")} <i>kg</i></strong><span>{highestVolume.name} · {formatDate(highestVolume.bestSessionVolume.date)}</span></article>
      </section>

      <div id="exercise-evolution">
        <ExerciseEvolutionPanel
          exercises={evolution}
          selectedExerciseKey={selectedExerciseKey}
          onSelectExercise={setSelectedExerciseKey}
        />
      </div>

      <section className="records-catalog">
        <header>
          <div><span className="eyebrow">POR EXERCÍCIO</span><h2>{records.length} exercício(s) com histórico</h2></div>
          <label>Buscar exercício<input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Ex.: supino" /></label>
        </header>
        {!filtered.length && <p className="records-empty">Nenhum exercício corresponde à busca.</p>}
        <div className="records-grid">
          {filtered.map((record) => <article className="record-card" key={record.key}>
            <header><div><small>{record.sessions} sessão(ões)</small><h3>{record.name}</h3></div><span aria-hidden="true">★</span></header>
            <dl>
              <div><dt>Maior carga</dt><dd>{record.bestLoad.loadKg.toLocaleString("pt-BR")} kg × {record.bestLoad.reps}</dd><small>{formatDate(record.bestLoad.date)}</small></div>
              <div><dt>Melhor 1RM estimada</dt><dd>{record.bestEstimated1Rm.estimated1Rm.toLocaleString("pt-BR")} kg</dd><small>{record.bestEstimated1Rm.loadKg.toLocaleString("pt-BR")} kg × {record.bestEstimated1Rm.reps} · {formatDate(record.bestEstimated1Rm.date)}</small></div>
              <div><dt>Maior volume</dt><dd>{record.bestSessionVolume.volumeKg.toLocaleString("pt-BR")} kg</dd><small>{formatDate(record.bestSessionVolume.date)}</small></div>
            </dl>
            <button
              className="record-card__evolution"
              type="button"
              disabled={!evolution.some((item) => item.key === record.key)}
              onClick={() => {
                setSelectedExerciseKey(record.key);
                document.getElementById("exercise-evolution")?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
            >
              Ver evolução
            </button>
          </article>)}
        </div>
      </section>
    </>}

    {!loading && !records.length && !message && <section className="records-empty">
      <h2>Seu primeiro recorde começa no próximo treino</h2>
      <p>Conclua séries com carga e repetições para formar uma referência segura.</p>
    </section>}
  </main>;
}
