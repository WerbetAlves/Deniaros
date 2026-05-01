import Image from "next/image";
import { redirect } from "next/navigation";
import { updatePassword } from "@/app/auth/actions";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function ResetPasswordPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  const { error } = await searchParams;

  if (!user) {
    redirect(
      `/login?mode=recovery&error=${encodeURIComponent(
        "Sua sessão de recuperação expirou. Solicite um novo link."
      )}`
    );
  }

  return (
    <main className="auth-page">
      <section className="auth-panel">
        <div className="auth-logo-lockup auth-logo-lockup-image">
          <Image
            alt="Deniaros"
            className="brand-wordmark-image"
            height={108}
            priority
            src="/brand/logo-horizontal-tagline-transparente.png"
            width={320}
          />
        </div>

        <div className="auth-copy">
          <h2>Defina sua nova senha.</h2>
          <p>Recuperação</p>
        </div>

        {error ? <p className="form-error">{error}</p> : null}

        <form action={updatePassword} className="auth-form">
          <label>
            Nova senha
            <input
              autoComplete="new-password"
              minLength={6}
              name="password"
              required
              type="password"
            />
          </label>

          <label>
            Confirmar senha
            <input
              autoComplete="new-password"
              minLength={6}
              name="confirmPassword"
              required
              type="password"
            />
          </label>

          <button className="primary-button" type="submit">
            Atualizar senha
          </button>
        </form>
      </section>
    </main>
  );
}
