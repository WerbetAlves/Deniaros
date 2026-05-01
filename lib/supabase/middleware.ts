import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { assertSupabaseConfig } from "@/lib/supabase/config";

const profileOnboardingCookie = "deniaros-profile-onboarding-ready";
const profileOnboardingSkipCookie = "deniaros-profile-onboarding-skipped";

export async function updateSession(request: NextRequest) {
  const { url, publishableKey } = assertSupabaseConfig();

  let response = NextResponse.next({
    request: {
      headers: request.headers
    }
  });

  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });

        response = NextResponse.next({
          request
        });

        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      }
    }
  });

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return response;
  }

  if (request.method !== "GET" && request.method !== "HEAD") {
    return response;
  }

  if (isPathBypassedForProfileOnboarding(request.nextUrl.pathname)) {
    return response;
  }

  const readyCookie = request.cookies.get(profileOnboardingCookie)?.value;
  const skippedCookie = request.cookies.get(profileOnboardingSkipCookie)?.value;

  if (readyCookie === user.id || skippedCookie === user.id) {
    return response;
  }

  const { data: workspace, error: workspaceError } = await supabase
    .from("workspaces")
    .select("id")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle<{ id: string }>();

  if (workspaceError || !workspace?.id) {
    return response;
  }

  const { data: personalProfile, error: profileError } = await supabase
    .from("personal_profiles")
    .select("workspace_id")
    .eq("workspace_id", workspace.id)
    .maybeSingle<{ workspace_id: string }>();

  if (profileError) {
    if (profileError.code === "42P01") {
      return response;
    }

    return response;
  }

  if (personalProfile) {
    response.cookies.set(profileOnboardingCookie, user.id, {
      httpOnly: true,
      maxAge: 60 * 60 * 24 * 180,
      path: "/",
      sameSite: "lax"
    });
    response.cookies.delete(profileOnboardingSkipCookie);

    return response;
  }

  const nextPath = `${request.nextUrl.pathname}${request.nextUrl.search}`;
  const redirectUrl = new URL("/personal-profile", request.url);
  redirectUrl.searchParams.set("onboarding", "1");
  redirectUrl.searchParams.set("next", nextPath);

  return NextResponse.redirect(redirectUrl);
}

function isPathBypassedForProfileOnboarding(pathname: string) {
  if (pathname.startsWith("/personal-profile")) {
    return true;
  }

  if (pathname.startsWith("/auth")) {
    return true;
  }

  if (pathname.startsWith("/login")) {
    return true;
  }

  if (pathname.startsWith("/reset-password")) {
    return true;
  }

  return false;
}
