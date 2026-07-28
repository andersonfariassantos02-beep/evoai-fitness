import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { toDateKey } from "../lib/trainingCalendar";
import { isExerciseCatalogAdmin } from "../services/exerciseCatalogService";
import {
  confirmPasswordAndDeleteTest,
  listTestWorkouts,
  type TestWorkoutSummary,
} from "../services/testLabService";

function statusLabel(status: TestWorkoutSummary["status"]) {
  if (status === "completed") return "Concluído";
  if (status === "paused") return "Pausado";
  return "Em andamento";
}

export default function TestLabPage() {
  const { user } = useAuth();
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [tests, setTests] = useState<TestWorkoutSummary[]>([]);
  const [deleting, setDeleting] = useState<TestWorkoutSummary | null>(null);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const today = useMemo(() => toDateKey(new Date()), []);

  async function refresh(userId: string) {
    setTests(await listTestWorkouts(userId));
  }

  useEffect(() => {
    if (!user) return;
    void isExerciseCatalogAdmin(user.id).then(async (isAdmin) => {
      setAllowed(isAdmin);
      if (isAdmin) await refresh(user.id);
    }).catch(() => setAllowed(false));
  }, [user]);

  async function deleteTest(event: FormEvent) {
    event.preventDefault();
    if (!deleting || !user) return;
    setBusy(true);
    setMessage("");
    try {
      await confirmPasswordAndDeleteTest(deleting.id, password);
      await refresh(user.id);
      setDeleting(null);
      setPassword("");
      setMessage("Teste excluído. Nenhum dado real foi alterado.");
    } catch (error) {
      setMessage(error instanceof Error && error.message === "INVALID_PASSWORD"
        ? "Senha incorreta. O teste não foi excluído."
        : "Não foi possível excluir o teste.");
    } finally {
      setBusy(false);
    }
  }

  if (allowed === null) {
    return <main className="centered-screen"><span className="spinner" /><p>Verificando acesso…</p></main>;
  }
  if (!allowed) {
    return <main className="centered-screen"><section className="notice-card"><p className="eyebrow">ACESSO RESTRITO</p><h1>Laboratório não autorizado.</h1><Link to="/app">Voltar</Link></section></main>;
  }

  const todayTest = tests.find((item) => item.trainingDate === today);
  const createHref = `/preparar-treino/${today}?label=${encodeURIComponent("Teste administrativo")}&test=1`;

  return <main className="test-lab">
    <header className="profile-header">
      <Link to="/app">← Calendário</Link>
      <div>
        <span className="eyebrow">SOMENTE ADMINISTRADOR</span>
        <h1>Laboratório de testes</h1>
        <p>Simule uma sessão completa sem afetar calendário, evolução, recomendações ou relatórios reais.</p>
      </div>
    </header>

    {message && <p className="profile-message" role="status">{message}</p>}

    <section className="test-lab__intro">
      <div><strong>Ambiente isolado</strong><span>Todos os registros desta área são identificados como teste.</span></div>
      {todayTest
        ? <Link className="primary-link" to={`/treino/${todayTest.trainingDate}?label=${encodeURIComponent(todayTest.workoutLabel)}&test=1`}>Abrir teste de hoje</Link>
        : <Link className="primary-link" to={createHref}>Criar teste de hoje</Link>}
    </section>

    <section className="test-lab__list" aria-label="Testes administrativos">
      <div className="test-lab__section-title"><h2>Testes salvos</h2><span>{tests.length}</span></div>
      {tests.length === 0 && <div className="test-lab__empty">Nenhum teste criado. Comece uma simulação para validar o fluxo completo.</div>}
      {tests.map((test) => <article className="test-lab__card" key={test.id}>
        <div>
          <span className={`test-status test-status--${test.status}`}>{statusLabel(test.status)}</span>
          <h3>{test.workoutLabel}</h3>
          <small>{new Date(`${test.trainingDate}T12:00:00`).toLocaleDateString("pt-BR")} · criado em {new Date(test.createdAt).toLocaleString("pt-BR")}</small>
        </div>
        <div className="test-lab__actions">
          <Link to={`/treino/${test.trainingDate}?label=${encodeURIComponent(test.workoutLabel)}&test=1`}>{test.status === "completed" ? "Revisar" : "Continuar"}</Link>
          <button className="danger-action" type="button" onClick={() => { setDeleting(test); setPassword(""); setMessage(""); }}>Excluir teste</button>
        </div>
      </article>)}
    </section>

    {deleting && <div className="confirmation-backdrop" role="presentation">
      <section className="confirmation-dialog" role="dialog" aria-modal="true" aria-labelledby="delete-test-title">
        <span className="setup-status setup-status--locked">EXCLUSÃO PROTEGIDA</span>
        <h2 id="delete-test-title">Excluir “{deleting.workoutLabel}”?</h2>
        <p>Somente os dados deste teste serão removidos. Digite sua senha atual para confirmar.</p>
        <form onSubmit={deleteTest}>
          <label>Senha atual<input type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} autoFocus /></label>
          <div>
            <button type="button" disabled={busy} onClick={() => { setDeleting(null); setPassword(""); }}>Cancelar</button>
            <button className="danger-action" type="submit" disabled={busy || !password}>{busy ? "Excluindo…" : "Confirmar exclusão"}</button>
          </div>
        </form>
      </section>
    </div>}
  </main>;
}
