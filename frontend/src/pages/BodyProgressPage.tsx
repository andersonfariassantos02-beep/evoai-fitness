import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { useAuth } from "../contexts/AuthContext";
import {
  deleteBodyMeasurement,
  loadBodyMeasurements,
  saveBodyMeasurement,
  validateBodyMeasurement,
  type BodyMeasurement,
  type BodyMeasurementInput,
} from "../services/bodyMeasurementService";

function localDate() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

function emptyInput(): BodyMeasurementInput {
  return {
    measuredOn: localDate(),
    weightKg: "",
    bodyFatPercentage: "",
    waistCm: "",
    chestCm: "",
    hipsCm: "",
    armCm: "",
    thighCm: "",
    notes: "",
  };
}

function formatNumber(value: number | null, unit: string) {
  return value === null ? "—" : `${value.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} ${unit}`;
}

function WeightTrend({ measurements }: { measurements: BodyMeasurement[] }) {
  const points = measurements
    .filter((item) => item.weightKg !== null)
    .slice()
    .reverse()
    .slice(-12);
  if (points.length < 2) return <p className="body-progress-empty">Registre peso em pelo menos duas datas para visualizar a tendência.</p>;

  const weights = points.map((item) => item.weightKg as number);
  const minimum = Math.min(...weights);
  const maximum = Math.max(...weights);
  const range = maximum - minimum || 1;
  const coordinates = points.map((item, index) => {
    const x = points.length === 1 ? 50 : 5 + (index / (points.length - 1)) * 90;
    const y = 88 - (((item.weightKg as number) - minimum) / range) * 70;
    return { x, y, item };
  });

  return <div className="body-progress-chart">
    <svg viewBox="0 0 100 100" role="img" aria-label="Evolução do peso corporal">
      <polyline points={coordinates.map(({ x, y }) => `${x},${y}`).join(" ")} fill="none" stroke="currentColor" strokeWidth="3" vectorEffect="non-scaling-stroke" />
      {coordinates.map(({ x, y, item }) => <circle key={item.id} cx={x} cy={y} r="2.4"><title>{`${item.measuredOn}: ${item.weightKg} kg`}</title></circle>)}
    </svg>
    <div><span>{points[0].measuredOn.split("-").reverse().join("/")}</span><strong>{minimum.toLocaleString("pt-BR")}–{maximum.toLocaleString("pt-BR")} kg</strong><span>{points.at(-1)?.measuredOn.split("-").reverse().join("/")}</span></div>
  </div>;
}

export default function BodyProgressPage() {
  const { user } = useAuth();
  const [measurements, setMeasurements] = useState<BodyMeasurement[]>([]);
  const [input, setInput] = useState<BodyMeasurementInput>(emptyInput);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    if (!user) return;
    try {
      setMeasurements(await loadBodyMeasurements(user.id));
      return true;
    } catch {
      setMessage("Não foi possível carregar suas medidas.");
      return false;
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { void refresh(); }, [refresh]);

  const weightChange = useMemo(() => {
    const weighted = measurements.filter((item) => item.weightKg !== null);
    if (weighted.length < 2) return null;
    return (weighted[0].weightKg as number) - (weighted.at(-1)?.weightKg as number);
  }, [measurements]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!user) return;
    const validation = validateBodyMeasurement(input);
    if (validation) {
      setMessage(validation);
      return;
    }
    setBusy(true);
    try {
      await saveBodyMeasurement(user.id, input);
      setInput(emptyInput());
      await refresh();
      setMessage("Medição salva. Registros na mesma data são atualizados, sem duplicação.");
    } catch (error) {
      setMessage(error instanceof Error && error.message ? error.message : "Não foi possível salvar a medição.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(item: BodyMeasurement) {
    if (!user || !window.confirm(`Excluir a medição de ${item.measuredOn.split("-").reverse().join("/")}?`)) return;
    setBusy(true);
    try {
      await deleteBodyMeasurement(user.id, item.id);
      await refresh();
      setMessage("Medição excluída.");
    } catch {
      setMessage("Não foi possível excluir a medição.");
    } finally {
      setBusy(false);
    }
  }

  const latest = measurements[0];

  return <main className="body-progress-page">
    <header className="body-progress-header">
      <span className="eyebrow">EVOLUÇÃO CORPORAL</span>
      <h1>Peso e medidas</h1>
      <p>Acompanhe tendências ao longo do tempo. Compare sempre em condições semelhantes e evite interpretar uma medição isolada.</p>
    </header>

    {loading && <p className="body-progress-message" role="status">Carregando evolução…</p>}
    {!loading && message && <p className="body-progress-message" role="status">{message}</p>}

    <section className="body-progress-summary" aria-label="Resumo da evolução">
      <article><small>ÚLTIMO PESO</small><strong>{formatNumber(latest?.weightKg ?? null, "kg")}</strong><span>{latest ? latest.measuredOn.split("-").reverse().join("/") : "Sem registros"}</span></article>
      <article><small>VARIAÇÃO TOTAL</small><strong>{weightChange === null ? "—" : `${weightChange > 0 ? "+" : ""}${weightChange.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} kg`}</strong><span>Entre o primeiro e o último registro</span></article>
      <article><small>ÚLTIMA CINTURA</small><strong>{formatNumber(latest?.waistCm ?? null, "cm")}</strong><span>Use como complemento ao peso</span></article>
    </section>

    <div className="body-progress-layout">
      <form className="body-progress-card body-progress-form" onSubmit={submit}>
        <div><span className="eyebrow">NOVA MEDIÇÃO</span><h2>Registrar evolução</h2></div>
        <label>Data<input type="date" required value={input.measuredOn} onChange={(event) => setInput({ ...input, measuredOn: event.target.value })} /></label>
        <div className="body-progress-fields">
          <label>Peso <small>kg</small><input inputMode="decimal" placeholder="Ex.: 82,5" value={input.weightKg} onChange={(event) => setInput({ ...input, weightKg: event.target.value })} /></label>
          <label>Gordura corporal <small>%</small><input inputMode="decimal" placeholder="Opcional" value={input.bodyFatPercentage} onChange={(event) => setInput({ ...input, bodyFatPercentage: event.target.value })} /></label>
          <label>Cintura <small>cm</small><input inputMode="decimal" value={input.waistCm} onChange={(event) => setInput({ ...input, waistCm: event.target.value })} /></label>
          <label>Peito <small>cm</small><input inputMode="decimal" value={input.chestCm} onChange={(event) => setInput({ ...input, chestCm: event.target.value })} /></label>
          <label>Quadril <small>cm</small><input inputMode="decimal" value={input.hipsCm} onChange={(event) => setInput({ ...input, hipsCm: event.target.value })} /></label>
          <label>Braço <small>cm</small><input inputMode="decimal" value={input.armCm} onChange={(event) => setInput({ ...input, armCm: event.target.value })} /></label>
          <label>Coxa <small>cm</small><input inputMode="decimal" value={input.thighCm} onChange={(event) => setInput({ ...input, thighCm: event.target.value })} /></label>
        </div>
        <label>Observação <small>(opcional)</small><textarea maxLength={500} value={input.notes} onChange={(event) => setInput({ ...input, notes: event.target.value })} placeholder="Ex.: medição em jejum, pela manhã" /></label>
        <button disabled={busy}>{busy ? "Salvando…" : "Salvar medição"}</button>
      </form>

      <section className="body-progress-card">
        <div><span className="eyebrow">TENDÊNCIA</span><h2>Peso corporal</h2></div>
        <WeightTrend measurements={measurements} />
      </section>

      <section className="body-progress-card body-progress-history">
        <div><span className="eyebrow">HISTÓRICO</span><h2>Medições registradas</h2></div>
        {!measurements.length && <p className="body-progress-empty">Nenhuma medição cadastrada.</p>}
        {measurements.map((item) => <article key={item.id}>
          <div><strong>{item.measuredOn.split("-").reverse().join("/")}</strong><span>{formatNumber(item.weightKg, "kg")} · cintura {formatNumber(item.waistCm, "cm")}</span></div>
          <dl>
            <div><dt>Gordura</dt><dd>{formatNumber(item.bodyFatPercentage, "%")}</dd></div>
            <div><dt>Peito</dt><dd>{formatNumber(item.chestCm, "cm")}</dd></div>
            <div><dt>Quadril</dt><dd>{formatNumber(item.hipsCm, "cm")}</dd></div>
            <div><dt>Braço</dt><dd>{formatNumber(item.armCm, "cm")}</dd></div>
            <div><dt>Coxa</dt><dd>{formatNumber(item.thighCm, "cm")}</dd></div>
          </dl>
          {item.notes && <p>{item.notes}</p>}
          <button type="button" disabled={busy} onClick={() => void remove(item)}>Excluir</button>
        </article>)}
      </section>
    </div>
  </main>;
}
