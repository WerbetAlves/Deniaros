"use client";

import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { useState } from "react";
import {
  requestPasswordRecovery,
  signIn,
  signInWithGoogle,
  signUp
} from "@/app/auth/actions";
import { AuthToast } from "@/components/auth-toast";

type LoginAlert = {
  description: string;
  kind: "error" | "success";
  title: string;
} | null;

type LoginViewProps = {
  alert: LoginAlert;
  isRecovery: boolean;
  isSignup: boolean;
  nextPath: string;
};

export function LoginView({ alert, isRecovery, isSignup, nextPath }: LoginViewProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const shouldPersistNextPath = nextPath !== "/";
  const nextQuery = shouldPersistNextPath ? `&next=${encodeURIComponent(nextPath)}` : "";
  const recoveryHref = `/login?mode=recovery${nextQuery}`;

  return (
    <main className="auth-page auth-v3-page">
      {alert ? (
        <AuthToast
          description={alert.description}
          kind={alert.kind}
          title={alert.title}
        />
      ) : null}

      <section className="auth-v3-layout">
        <aside className="auth-v3-showcase">
          <div className="auth-v3-showcase-glow" aria-hidden="true" />

          <div className="auth-v3-brand">
            <div className="auth-v3-brand-mark">
              <Image
                alt="Deniaros"
                className="brand-logo-clean"
                height={64}
                priority
                src="/brand/logo-icone-isolado-limpo.png"
                width={64}
              />
            </div>
            <div className="auth-v3-brand-copy">
              <strong>Deniaros</strong>
              <p>Gestão financeira inteligente</p>
            </div>
          </div>

          <div className="auth-v3-hero">
            <h2>Bem-vindo de volta.</h2>
            <p>Entre na sua conta para continuar.</p>
          </div>

          <div className="auth-v3-chart" aria-hidden="true">
            <div className="auth-v3-bars">
              <span />
              <span />
              <span />
              <span />
              <span />
              <span />
            </div>
            <svg viewBox="0 0 620 220">
              <path d="M0 190 L78 142 L140 160 L198 124 L262 118 L326 82 L390 88 L458 38 L520 26 L620 6" />
              <circle cx="78" cy="142" r="5" />
              <circle cx="140" cy="160" r="5" />
              <circle cx="198" cy="124" r="5" />
              <circle cx="262" cy="118" r="5" />
              <circle cx="326" cy="82" r="5" />
              <circle cx="390" cy="88" r="5" />
              <circle cx="458" cy="38" r="5" />
              <circle cx="520" cy="26" r="5" />
            </svg>
          </div>

          <div className="auth-v3-benefits">
            <article>
              <span className="auth-v3-benefit-icon">
                <ChartPieIcon />
              </span>
              <div>
                <strong>Visão completa</strong>
                <p>Todas as suas contas em um só lugar.</p>
              </div>
            </article>
            <article>
              <span className="auth-v3-benefit-icon">
                <TargetIcon />
              </span>
              <div>
                <strong>Planejámento</strong>
                <p>Metas, orçamentos e cenários futuros.</p>
              </div>
            </article>
            <article>
              <span className="auth-v3-benefit-icon">
                <BrainIcon />
              </span>
              <div>
                <strong>Decisões melhores</strong>
                <p>Dados inteligentes para escolhas seguras.</p>
              </div>
            </article>
          </div>
        </aside>

        <section className="auth-v3-panel">
          <div className="auth-v3-form-head">
            <p>
              {isSignup
                ? "Crie sua conta"
                : isRecovery
                  ? "Recupere seu acesso"
                  : "Acesso a sua conta"}
            </p>
            <span aria-hidden="true" />
          </div>

          {isSignup ? (
            <form action={signUp} className="auth-v3-form">
              {shouldPersistNextPath ? <input name="next" type="hidden" value={nextPath} /> : null}
              <label className="auth-v3-label">
                Nome
                <div className="auth-v3-input-shell">
                  <UserIcon className="auth-v3-input-icon" />
                  <input
                    autoComplete="name"
                    name="displayName"
                    placeholder="Seu nome"
                    required
                    type="text"
                  />
                </div>
              </label>

              <label className="auth-v3-label">
                E-mail
                <div className="auth-v3-input-shell">
                  <MailIcon className="auth-v3-input-icon" />
                  <input
                    autoComplete="email"
                    name="email"
                    placeholder="seu@email.com"
                    required
                    type="email"
                  />
                </div>
              </label>

              <label className="auth-v3-label">
                Senha
                <div className="auth-v3-input-shell">
                  <LockIcon className="auth-v3-input-icon" />
                  <input
                    autoComplete="new-password"
                    minLength={6}
                    name="password"
                    placeholder="Crie uma senha"
                    required
                    type={showSignupPassword ? "text" : "password"}
                  />
                  <button
                    aria-label={
                      showSignupPassword ? "Ocultar senha" : "Mostrar senha"
                    }
                    className="auth-v3-eye"
                    onClick={() => setShowSignupPassword((current) => !current)}
                    type="button"
                  >
                    {showSignupPassword ? (
                      <EyeOffIcon className="auth-v3-input-icon" />
                    ) : (
                      <EyeIcon className="auth-v3-input-icon" />
                    )}
                  </button>
                </div>
              </label>

              <button className="auth-v3-primary" type="submit">
                Cadastrar
              </button>
            </form>
          ) : isRecovery ? (
            <form action={requestPasswordRecovery} className="auth-v3-form">
              <label className="auth-v3-label">
                E-mail
                <div className="auth-v3-input-shell">
                  <MailIcon className="auth-v3-input-icon" />
                  <input
                    autoComplete="email"
                    name="email"
                    placeholder="seu@email.com"
                    required
                    type="email"
                  />
                </div>
              </label>

              <button className="auth-v3-primary" type="submit">
                Enviar link de recuperação
              </button>
            </form>
          ) : (
            <>
              <form action={signIn} className="auth-v3-form">
                {shouldPersistNextPath ? <input name="next" type="hidden" value={nextPath} /> : null}
                <label className="auth-v3-label">
                  E-mail
                  <div className="auth-v3-input-shell">
                    <MailIcon className="auth-v3-input-icon" />
                    <input
                      autoComplete="email"
                      name="email"
                      placeholder="seu@email.com"
                      required
                      type="email"
                    />
                  </div>
                </label>

                <label className="auth-v3-label">
                  Senha
                  <div className="auth-v3-input-shell">
                    <LockIcon className="auth-v3-input-icon" />
                    <input
                      autoComplete="current-password"
                      name="password"
                      placeholder="Sua senha"
                      required
                      type={showPassword ? "text" : "password"}
                    />
                    <button
                      aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                      className="auth-v3-eye"
                      onClick={() => setShowPassword((current) => !current)}
                      type="button"
                    >
                      {showPassword ? (
                        <EyeOffIcon className="auth-v3-input-icon" />
                      ) : (
                        <EyeIcon className="auth-v3-input-icon" />
                      )}
                    </button>
                  </div>
                </label>

                <div className="auth-v3-form-tools">
                  <label className="auth-v3-remember">
                    <input name="remember" type="checkbox" />
                    <span>Lembrar de mim</span>
                  </label>
                  <Link className="auth-v3-helper-link" href={recoveryHref}>
                    Esqueci minha senha
                  </Link>
                </div>

                <button className="auth-v3-primary" type="submit">
                  Entrar
                </button>
              </form>

              <div className="auth-v3-divider">
                <span />
                <small>ou</small>
                <span />
              </div>

              <form action={signInWithGoogle} className="auth-v3-form auth-v3-oauth">
                {shouldPersistNextPath ? <input name="next" type="hidden" value={nextPath} /> : null}
                <button className="auth-v3-google" type="submit">
                  <GoogleIcon className="google-mark" />
                  Continuar com Google
                </button>
              </form>
            </>
          )}

          <div className="auth-v3-switch">
            {isSignup ? (
              <p>
                Já tem uma conta? <Link href="/login">Entrar</Link>
              </p>
            ) : isRecovery ? (
              <p>
                Lembrou sua senha? <Link href="/login">Voltar para entrar</Link>
              </p>
            ) : (
              <p>
                Não tem uma conta? <Link href="/login?mode=signup">Cadastre-se</Link>
              </p>
            )}
          </div>

          <p className="auth-v3-safe">
            <ShieldIcon className="auth-v3-safe-icon" />
            Seus dados protegidos com criptografia bancária.
          </p>
        </section>
      </section>
    </main>
  );
}

function IconBase({
  children,
  className
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24">
      {children}
    </svg>
  );
}

function MailIcon({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <path d="M3.5 6.5h17v11h-17z" />
      <path d="m4 7 8 6 8-6" />
    </IconBase>
  );
}

function LockIcon({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <rect height="11" rx="2" width="15" x="4.5" y="10" />
      <path d="M7.5 10V7.6A4.6 4.6 0 0 1 12.1 3 4.6 4.6 0 0 1 16.7 7.6V10" />
    </IconBase>
  );
}

function UserIcon({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <circle cx="12" cy="8" r="3.4" />
      <path d="M5 20c.9-3.1 3.5-4.7 7-4.7s6.1 1.6 7 4.7" />
    </IconBase>
  );
}

function EyeIcon({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <path d="M2.5 12s3.3-5.7 9.5-5.7 9.5 5.7 9.5 5.7-3.3 5.7-9.5 5.7S2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="2.5" />
    </IconBase>
  );
}

function EyeOffIcon({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <path d="M3 3 21 21" />
      <path d="M8.3 8.3A4.8 4.8 0 0 1 16 12" />
      <path d="M12 6.3c6.2 0 9.5 5.7 9.5 5.7a14.5 14.5 0 0 1-3.5 3.8" />
      <path d="M6.1 15.8A14.7 14.7 0 0 1 2.5 12s1.3-2.2 3.7-3.8" />
    </IconBase>
  );
}

function ShieldIcon({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <path d="M12 3.5 19.5 6v5.8c0 4.4-2.8 7.5-7.5 8.7-4.7-1.2-7.5-4.3-7.5-8.7V6z" />
      <path d="m9.3 12.2 2 2.1 3.7-3.9" />
    </IconBase>
  );
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      viewBox="0 0 24 24"
    >
      <path
        d="M21.6 12.23c0-.78-.07-1.53-.2-2.23H12v4.26h5.37a4.59 4.59 0 0 1-1.99 3.01v2.5h3.22c1.89-1.74 3-4.3 3-7.54Z"
        fill="#4285F4"
      />
      <path
        d="M12 22c2.7 0 4.96-.9 6.6-2.43l-3.22-2.5c-.9.6-2.04.95-3.38.95-2.6 0-4.8-1.76-5.59-4.12H3.08v2.58A9.97 9.97 0 0 0 12 22Z"
        fill="#34A853"
      />
      <path
        d="M6.41 13.9A6.01 6.01 0 0 1 6.1 12c0-.66.11-1.3.31-1.9V7.52H3.08A9.97 9.97 0 0 0 2 12c0 1.61.39 3.13 1.08 4.48l3.33-2.58Z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.98c1.47 0 2.8.51 3.84 1.5l2.86-2.86A9.57 9.57 0 0 0 12 2a9.97 9.97 0 0 0-8.92 5.52l3.33 2.58C7.2 7.74 9.4 5.98 12 5.98Z"
        fill="#EA4335"
      />
    </svg>
  );
}

function ChartPieIcon({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <path d="M12 3.5v8.7h8.7A8.7 8.7 0 1 1 12 3.5Z" />
      <path d="M13 3.5a8.7 8.7 0 0 1 7.7 7.7H13z" />
    </IconBase>
  );
}

function TargetIcon({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="4.4" />
      <circle cx="12" cy="12" r="1.5" />
    </IconBase>
  );
}

function BrainIcon({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <path d="M9 6.2a3.3 3.3 0 0 1 6 0A3.4 3.4 0 0 1 18.5 10c0 2-1.2 3-2.6 3.4V16a3.4 3.4 0 0 1-6.8 0v-2.6C7.8 13 6.5 12 6.5 10A3.4 3.4 0 0 1 9 6.2Z" />
      <path d="M12 8v8M9.5 10.2h5M9.7 13.8h4.6" />
    </IconBase>
  );
}
