import { useMemo, useState, type FormEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { createMyProfile, type TrainingFocus, type TrainingGoal } from "../services/profileRestrictionService";

const GOALS: Record<TrainingGoal, string> = {
  general_fitness: "Condicionamento geral",
  weight_loss: "Emagrecimento",
  hypertrophy: "Hipertrofia",
  strength: "Força",
  conditioning: "Condicionamento",
};
const FOCUS: Record<TrainingFocus, string> = {
  full_body: "Corpo inteiro",
  glutes: "Glúteos",
  legs: "Pernas",
  chest: "Peito",
  back: "Costas",
  shoulders: "Ombros",
  arms: "Braços",
  core: "Abdômen e core",
};

export default function OnboardingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const testUser = user?.app_metadata?.evoai_test_user === true;
  const suggestedName = useMemo(() => String(user?.user_metadata?.full_name ?? user?.email?.split("@")[0] ?? "").replace(/[._-]+/g, " ").trim(), [user]);
  const [name, setName] = useState(testUser ? "Usuário Teste" : suggestedName);
  const [birthDate, setBirthDate] = useState("");
  const [goal, setGoal] = useState<TrainingGoal>("general_fitness");
  const [focus, setFocus] = useState<TrainingFocus[]>(["full_body"]);
  const [hasRestriction, setHasRestriction] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  function toggleFocus(value: TrainingFocus) {
    setFocus((current) => {
      if (current.includes(value)) return current.length === 1 ? current : current.filter((item) => item !== value);
      if (value === "full_body") return ["full_body"];
      const withoutFullBody = current.filter((item) => item !== "full_body");
      return withoutFullBody.length < 4 ? [...withoutFullBody, value] : withoutFullBody;
    });
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      await createMyProfile(name, birthDate, goal, focus);
      const requested = (location.state as { from?: string } | null)?.from;
      navigate(hasRestriction ? "/perfil" : requested && requested !== "/onboarding" ? requested : "/app", { replace: true });
    } catch {
      setMessage("Não foi possível criar o perfil. Revise os dados e tente novamente.");
      setBusy(false);
    }
  }

  return <main className="onboarding-shell">
    <section className="onboarding-intro">
      <span className="eyebrow">PRIMEIRO ACESSO</span>
      <h1>Vamos preparar seu treino.</h1>
      <p>Estas informações orientam a divisão muscular e as sugestões. Você poderá alterá-las depois.</p>
      <ol aria-label="Etapas de configuração">
        <li className="active">1 <span>Perfil e objetivo</span></li>
        <li>2 <span>Disponibilidade no calendário</span></li>
        <li>3 <span>Primeiro treino</span></li>
      </ol>
    </section>

    <form className="onboarding-card" onSubmit={submit}>
      <div>
        <span className="section-kicker">SEU PERFIL</span>
        <h2>Conte um pouco sobre você</h2>
        {testUser && <p className="onboarding-test-note">Conta fictícia detectada. Os dados simulados já foram preenchidos.</p>}
      </div>
      {message && <p className="form-message form-message--error" role="alert">{message}</p>}
      <label>Como devemos chamar você?
        <input value={name} maxLength={120} autoComplete="name" required onChange={(event) => setName(event.target.value)} />
      </label>
      <label>Data de nascimento <small>(opcional)</small>
        <input type="date" value={birthDate} onChange={(event) => setBirthDate(event.target.value)} />
      </label>
      <label>Objetivo principal
        <select value={goal} onChange={(event) => setGoal(event.target.value as TrainingGoal)}>
          {Object.entries(GOALS).map(([value, label]) => <option value={value} key={value}>{label}</option>)}
        </select>
      </label>
      <fieldset className="training-focus">
        <legend>Foco muscular <small>(selecione até 4)</small></legend>
        {Object.entries(FOCUS).map(([value, label]) => {
          const item = value as TrainingFocus;
          return <label key={value}><input type="checkbox" checked={focus.includes(item)} onChange={() => toggleFocus(item)} />{label}</label>;
        })}
      </fieldset>
      <label className="onboarding-restriction-check"><input type="checkbox" checked={hasRestriction} onChange={(event) => setHasRestriction(event.target.checked)} />Tenho uma restrição, lesão ou orientação profissional para cadastrar</label>
      {hasRestriction && <p className="onboarding-test-note">Depois de salvar, abriremos “Meu perfil” para você registrar a restrição com segurança.</p>}
      <p className="profile-safety-note">Na próxima tela, marque no calendário as datas em que realmente poderá treinar. O EvoAI não presumirá uma escala fixa.</p>
      <button className="primary-button" disabled={busy || !name.trim()}>{busy ? "Criando perfil…" : "Salvar e abrir calendário"}</button>
    </form>
  </main>;
}
