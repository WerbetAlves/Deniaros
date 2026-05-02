import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = normalizeCallbackNextPath(requestUrl.searchParams.get("next"));
  const providerError =
    requestUrl.searchParams.get("error_description") ??
    requestUrl.searchParams.get("error_code") ??
    requestUrl.searchParams.get("error");

  if (providerError) {
    return redirectToLoginError(requestUrl, providerError);
  }

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(new URL(next, requestUrl.origin));
    }

    return redirectToLoginError(requestUrl, error.message);
  }

  return redirectToLoginError(
    requestUrl,
    "Não recebemos o código de autenticação do provedor."
  );
}

function redirectToLoginError(requestUrl: URL, message: string) {
  return NextResponse.redirect(
    new URL(
      `/login?error=${encodeURIComponent(message)}`,
      requestUrl.origin
    )
  );
}

function normalizeCallbackNextPath(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/";
  }

  return value;
}
