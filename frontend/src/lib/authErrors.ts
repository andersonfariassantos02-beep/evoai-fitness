interface AuthErrorLike {
  code?: string;
  message?: string;
  status?: number;
}

const messages: Record<string, string> = {
  invalid_credentials: "E-mail ou senha inválidos.",
  email_not_confirmed: "Confirme seu e-mail antes de entrar.",
  user_already_exists: "Já existe uma conta com este e-mail.",
  weak_password: "Escolha uma senha mais forte.",
  over_request_rate_limit: "Muitas tentativas. Aguarde alguns minutos e tente novamente.",
  signup_disabled: "A criação de contas está temporariamente desativada.",
};

export function getAuthErrorMessage(error: unknown): string {
  if (!error || typeof error !== "object") return "Não foi possível concluir. Tente novamente.";

  const authError = error as AuthErrorLike;
  if (authError.code && messages[authError.code]) return messages[authError.code];
  if (authError.status === 429) return messages.over_request_rate_limit;
  if (authError.message?.includes("Supabase não configurado")) return authError.message;

  return "Não foi possível concluir. Verifique os dados e tente novamente.";
}
