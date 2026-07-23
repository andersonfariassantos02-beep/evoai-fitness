import { getSupabaseClient } from "../lib/supabase";

export function login(email: string, password: string) {
  return getSupabaseClient().auth.signInWithPassword({ email, password });
}

export function register(email: string, password: string) {
  const appUrl = new URL(import.meta.env.BASE_URL, window.location.origin);

  return getSupabaseClient().auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${appUrl.href}#/login?confirmed=true`,
    },
  });
}

export function logout() {
  return getSupabaseClient().auth.signOut();
}

export function requestPasswordReset(email: string) {
  const appUrl = new URL(import.meta.env.BASE_URL, window.location.origin);
  return getSupabaseClient().auth.resetPasswordForEmail(email, {
    redirectTo: `${appUrl.href}#/redefinir-senha`,
  });
}

export function updatePassword(password: string) {
  return getSupabaseClient().auth.updateUser({ password });
}

export async function getCurrentUser() {
  const { data: { user } } = await getSupabaseClient().auth.getUser();
  return user;
}
