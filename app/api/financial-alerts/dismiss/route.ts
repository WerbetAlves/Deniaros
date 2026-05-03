import { NextResponse } from "next/server";
import { dismissFinancialAlert } from "@/lib/active-financial-alerts";
import { getWorkspaceContext } from "@/lib/workspace-context";

export async function POST(request: Request) {
  const { supabase, workspaceId } = await getWorkspaceContext();
  const formData = await request.formData();
  const alertId = String(formData.get("alertId") ?? "").trim();
  const returnTo = normalizeReturnTo(formData.get("returnTo"));

  if (alertId) {
    await dismissFinancialAlert({
      alertId,
      supabase,
      workspaceId
    });
  }

  return NextResponse.redirect(new URL(returnTo, request.url), 303);
}

function normalizeReturnTo(value: FormDataEntryValue | null) {
  const raw = String(value ?? "/");

  if (!raw.startsWith("/") || raw.startsWith("//")) {
    return "/";
  }

  return raw;
}
