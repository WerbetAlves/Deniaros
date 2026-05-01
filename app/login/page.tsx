import { redirect } from "next/navigation";
import { LoginView } from "@/app/login/view";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function LoginPage({
  searchParams
}: {
  searchParams: Promise<{
    attempts?: string;
    error?: string;
    message?: string;
    mode?: string;
  }>;
}) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/");
  }

  const { attempts, error, message, mode } = await searchParams;
  const isSignup = mode === "signup";
  const isRecovery = mode === "recovery";
  const alert = resolveLoginAlert(error, message, attempts);

  return <LoginView alert={alert} isRecovery={isRecovery} isSignup={isSignup} />;
}

function resolveLoginAlert(error?: string, message?: string, attempts?: string) {
  if (error) {
    if (error === "invalid_credentials") {
      const failedAttempts = Number(attempts ?? "0");

      if (failedAttempts >= 3) {
        return {
          kind: "error" as const,
          title: "Ainda não conseguimos entrar.",
          description:
            "Verifique seu e-mail e sua senha com carinho ou use a opção de recuperar senha."
        };
      }

      return {
        kind: "error" as const,
        title: "Ops! Parece que a senha não confere.",
        description: "Vamos tentar mais uma vez?"
      };
    }

    if (error.includes("Unable to exchange external code")) {
      return {
        kind: "error" as const,
        title: "Não foi possível concluir o login com Google.",
        description:
          "Tente entrar com email e senha. Se não tiver conta, use o botao Cadastrar."
      };
    }

    return {
      kind: "error" as const,
      title: "Não foi possível concluir a autenticação.",
      description: error
    };
  }

  if (message) {
    return {
      kind: "success" as const,
      title: "Tudo certo.",
      description: message
    };
  }

  return null;
}
