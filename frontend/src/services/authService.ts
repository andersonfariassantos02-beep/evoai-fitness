import { getSupabaseClient } from "../lib/supabase";

export function login(email: string, password: string) {
  return getSupabaseClient().auth.signInWithPassword({ email, password });
}

export function register(email: string, password: string) {
  return getSupabaseClient().auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${window.location.origin}/#/login?confirmed=true`,
    },
  });
}

export function logout() {
  return getSupabaseClient().auth.signOut();
}

export async function getCurrentUser() {
  const { data: { user } } = await getSupabaseClient().auth.getUser();
  return user;
}
