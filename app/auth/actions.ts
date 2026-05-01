"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const loginAttemptsCookie = "deniaros-login-attempts";
const profileOnboardingCookie = "deniaros-profile-onboarding-ready";

export async function signIn(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const supabase = await createSupabaseServerClient();
  const cookieStore = await cookies();
  const currentAttempts = Number(
    cookieStore.get(loginAttemptsCookie)?.value ?? "0"
  );

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    if (error.message.toLowerCase().includes("invalid login credentials")) {
      const nextAttempts = currentAttempts + 1;

      cookieStore.set(loginAttemptsCookie, String(nextAttempts), {
        httpOnly: true,
        maxAge: 60 * 30,
        path: "/",
        sameSite: "lax"
      });

      redirect(`/login?error=invalid_credentials&attempts=${nextAttempts}`);
    }

    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }

  cookieStore.delete(loginAttemptsCookie);
  redirect("/");
}

export async function signUp(formData: FormData) {
  const displayName = String(formData.get("displayName") ?? "").trim();
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const supabase = await createSupabaseServerClient();
  const origin = await getRequestOrigin();

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        display_name: displayName
      },
      emailRedirectTo: `${origin}/auth/callback`
    }
  });

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }

  redirect(
    `/login?message=${encodeURIComponent(
      "Cadastro criado. Se o Supabase pedir confirmação, confira seu e-mail antes de entrar."
    )}`
  );
}

export async function signInWithGoogle() {
  const supabase = await createSupabaseServerClient();
  const origin = await getRequestOrigin();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${origin}/auth/callback`
    }
  });

  if (error || !data.url) {
    redirect(
      `/login?error=${encodeURIComponent(
        error?.message ?? "Não foi possível iniciar o login com Google."
      )}`
    );
  }

  redirect(data.url);
}

export async function signOut() {
  const supabase = await createSupabaseServerClient();
  const cookieStore = await cookies();
  await supabase.auth.signOut();
  cookieStore.delete(loginAttemptsCookie);
  cookieStore.delete(profileOnboardingCookie);
  redirect("/login");
}

export async function requestPasswordRecovery(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const supabase = await createSupabaseServerClient();
  const origin = await getRequestOrigin();
  const cookieStore = await cookies();

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=/reset-password`
  });

  if (error) {
    redirect(`/login?mode=recovery&error=${encodeURIComponent(error.message)}`);
  }

  cookieStore.delete(loginAttemptsCookie);
  redirect(
    `/login?message=${encodeURIComponent(
      "Enviamos um link de recuperação. Confira seu e-mail para redefinir a senha."
    )}`
  );
}

export async function updatePassword(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");
  const supabase = await createSupabaseServerClient();
  const cookieStore = await cookies();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(
      `/login?mode=recovery&error=${encodeURIComponent(
        "Sua sessão de recuperação expirou. Solicite um novo link."
      )}`
    );
  }

  if (password.length < 6) {
    redirect(
      `/reset-password?error=${encodeURIComponent(
        "A nova senha precisa ter pelo menos 6 caracteres."
      )}`
    );
  }

  if (password !== confirmPassword) {
    redirect(
      `/reset-password?error=${encodeURIComponent(
        "A confirmação da senha não confere."
      )}`
    );
  }

  const { error } = await supabase.auth.updateUser({
    password
  });

  if (error) {
    redirect(`/reset-password?error=${encodeURIComponent(error.message)}`);
  }

  await supabase.auth.signOut();
  cookieStore.delete(loginAttemptsCookie);
  redirect(
    `/login?message=${encodeURIComponent(
      "Senha atualizada com sucesso. Agora é só entrar com a nova senha."
    )}`
  );
}

async function getRequestOrigin() {
  const configuredOrigin = process.env.NEXT_PUBLIC_APP_URL?.trim();

  if (configuredOrigin) {
    return configuredOrigin;
  }

  const headerStore = await headers();
  const origin = headerStore.get("origin");
  const host = headerStore.get("host");
  const protocol = headerStore.get("x-forwarded-proto") ?? "http";

  return origin ?? `${protocol}://${host ?? "127.0.0.1:3000"}`;
}
