import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { AuthShell } from "../components/AuthShell";
import { requestPasswordReset } from "../services/authService";

export default function ForgotPasswordPage() {
  const [email,setEmail]=useState("");const [message,setMessage]=useState("");const [error,setError]=useState("");const [busy,setBusy]=useState(false);
  async function submit(event:FormEvent){event.preventDefault();setError("");setMessage("");setBusy(true);try{const {error:requestError}=await requestPasswordReset(email.trim());if(requestError)throw requestError;setMessage("Se este e-mail estiver cadastrado, enviaremos as instruções para redefinir a senha.");}catch{setError("Não foi possível enviar agora. Aguarde alguns minutos e tente novamente.");}finally{setBusy(false);}}
  return <AuthShell eyebrow="RECUPERAR ACESSO" title="Redefina sua senha." description="Informe o e-mail da conta. Por segurança, a nova senha será escolhida somente por você.">{message&&<div className="form-message form-message--success" role="status">{message}</div>}{error&&<div className="form-message form-message--error" role="alert">{error}</div>}<form className="auth-form" onSubmit={submit}><label htmlFor="recovery-email">E-mail</label><input id="recovery-email" type="email" inputMode="email" autoComplete="email" required value={email} onChange={event=>setEmail(event.target.value)} placeholder="voce@exemplo.com"/><button className="primary-button" disabled={busy||!email}>{busy?"Enviando…":"Enviar instruções"}</button></form><p className="auth-switch"><Link to="/login">← Voltar para entrar</Link></p></AuthShell>;
}
