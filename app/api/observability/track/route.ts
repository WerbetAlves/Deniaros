import { headers } from "next/headers";
import { NextResponse } from "next/server";
import {
  trackObservabilityEvent,
  type ObservabilityEventType,
  type ObservabilitySeverity
} from "@/lib/observability";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ensureDefaultWorkspace } from "@/lib/workspace-bootstrap";

type TrackRequestBody = {
  eventName?: unknown;
  eventType?: unknown;
  properties?: unknown;
  route?: unknown;
  sessionKey?: unknown;
  severity?: unknown;
  workspaceId?: unknown;
};

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: true, tracked: false });
  }

  let body: TrackRequestBody;

  try {
    body = (await request.json()) as TrackRequestBody;
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const eventName = normalizeEventName(body.eventName);
  const eventType = normalizeEventType(body.eventType);

  if (!eventName || !eventType) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const workspaceId =
    typeof body.workspaceId === "string" && body.workspaceId.trim()
      ? body.workspaceId.trim()
      : await ensureDefaultWorkspace(supabase, user);
  const requestHeaders = await headers();

  try {
    await trackObservabilityEvent(supabase, {
      eventName,
      eventType,
      properties: normalizeProperties(body.properties),
      route: typeof body.route === "string" ? body.route : null,
      sessionKey: typeof body.sessionKey === "string" ? body.sessionKey : null,
      severity: normalizeSeverity(body.severity),
      source: "browser",
      userAgent: requestHeaders.get("user-agent"),
      userId: user.id,
      workspaceId
    });
  } catch {
    return NextResponse.json({ ok: true, tracked: false });
  }

  return NextResponse.json({ ok: true, tracked: true });
}

function normalizeEventName(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const next = value.trim();
  return next.length ? next : null;
}

function normalizeEventType(value: unknown): ObservabilityEventType | null {
  if (
    value === "activation" ||
    value === "error" ||
    value === "funnel" ||
    value === "pageview" ||
    value === "system"
  ) {
    return value;
  }

  return null;
}

function normalizeSeverity(value: unknown): ObservabilitySeverity {
  if (
    value === "debug" ||
    value === "warning" ||
    value === "error" ||
    value === "critical"
  ) {
    return value;
  }

  return "info";
}

function normalizeProperties(value: unknown) {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
