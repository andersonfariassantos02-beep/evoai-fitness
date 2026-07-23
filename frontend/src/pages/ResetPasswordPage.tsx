import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { AuthShell } from "../components/AuthShell";
import { updatePassword } from "../services/authService";

export default function ResetPasswordPage() {
  const navigate=useNavigate(); const [password,setPassword]=useState(""); const [confirmation,setConfirmation]=useState(""); const [message,setMessage]=useState(""); const [busy,setBusy]=useState(false);
  async function submit(event:FormEvent){event.preventDefault();setMessage("");if(password.length<8)return setMessage("Use pelo menos 8 caracteres.");if(password!==confirmation)return setMessage("As senhas não são iguais.");setBusy(true);try{const {error}=await updatePassword(password);if(error)throw error;navigate("/app",{replace:true});}catch{setMessage("Não foi possível atualizar a senha. Solicite um novo link.");setBusy(false);}}
  return <AuthShell eyebrow="CONTA SEGURA" title="Defina sua nova senha." description="O link de recuperação permite que somente você escolha a nova senha.">{message&&<div className="form-message form-message--error" role="alert">{message}</div>}<form className="auth-form" onSubmit={submit}><label htmlFor="new-password">Nova senha</label><input id="new-password" type="password" minLength={8} autoComplete="new-password" value={password} onChange={e=>setPassword(e.target.value)}/><label htmlFor="confirm-password">Confirmar senha</label><input id="confirm-password" type="password" minLength={8} autoComplete="new-password" value={confirmation} onChange={e=>setConfirmation(e.target.value)}/><button className="primary-button" disabled={busy||!password||!confirmation}>{busy?"Atualizando…":"Atualizar senha"}</button></form></AuthShell>;
}
