import type { SupabaseClient } from "@supabase/supabase-js";

export type ObservabilityEventType =
  | "activation"
  | "error"
  | "funnel"
  | "pageview"
  | "system";

export type ObservabilitySeverity = "debug" | "info" | "warning" | "error" | "critical";

export type ObservabilityEventInput = {
  eventName: string;
  eventType: ObservabilityEventType;
  properties?: Record<string, unknown>;
  route?: string | null;
  sessionKey?: string | null;
  severity?: ObservabilitySeverity;
  source?: "browser" | "server" | "system";
  userAgent?: string | null;
  userId: string;
  workspaceId?: string | null;
};

export type ObservabilityEventRow = {
  created_at: string;
  event_name: string;
  event_type: ObservabilityEventType;
  properties: Record<string, unknown> | null;
  route: string | null;
  severity: ObservabilitySeverity;
  source: string;
  user_id: string | null;
  workspace_id: string | null;
};

export type ObservabilitySummary = {
  activationScore: number;
  criticalErrors: number;
  eventsLast24Hours: number;
  funnel: Array<{
    count: number;
    key: string;
    label: string;
    percentage: number;
  }>;
  latestErrors: ObservabilityEventRow[];
  topRoutes: Array<{
    count: number;
    route: string;
  }>;
  uniqueUsers7Days: number;
  uniqueWorkspaces7Days: number;
};

export const activationFunnelSteps = [
  {
    key: "home",
    label: "Entrou no centro de comando",
    routes: ["/"]
  },
  {
    key: "accounts",
    label: "Visitou carteiras",
    routes: ["/accounts"]
  },
  {
    key: "transactions",
    label: "Visitou lançamentos",
    routes: ["/transactions"]
  },
  {
    key: "agenda",
    label: "Visitou agenda financeira",
    routes: ["/financial-agenda"]
  },
  {
    key: "reports",
    label: "Abriu relatórios",
    routes: ["/reports"]
  },
  {
    key: "assistant",
    label: "Procurou o Consultor IA",
    routes: ["/assistant", "/support"]
  }
] as const;

export async function trackObservabilityEvent(
  supabase: SupabaseClient,
  input: ObservabilityEventInput
) {
  if (!input.userId) {
    return;
  }

  await supabase.from("app_observability_events").insert({
    event_name: normalizeEventName(input.eventName),
    event_type: input.eventType,
    properties: sanitizeProperties(input.properties ?? {}),
    route: normalizeRoute(input.route),
    session_key: input.sessionKey ? input.sessionKey.slice(0, 120) : null,
    severity: input.severity ?? "info",
    source: input.source ?? "server",
    user_agent: input.userAgent ? input.userAgent.slice(0, 240) : null,
    user_id: input.userId,
    workspace_id: input.workspaceId ?? null
  });
}

export function buildObservabilitySummary(events: ObservabilityEventRow[]): ObservabilitySummary {
  const now = Date.now();
  const oneDayAgo = now - 24 * 60 * 60 * 1000;
  const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
  const recentEvents = events.filter((event) => new Date(event.created_at).getTime() >= sevenDaysAgo);
  const eventsLast24Hours = events.filter(
    (event) => new Date(event.created_at).getTime() >= oneDayAgo
  ).length;
  const uniqueUsers7Days = new Set(recentEvents.map((event) => event.user_id).filter(Boolean)).size;
  const uniqueWorkspaces7Days = new Set(
    recentEvents.map((event) => event.workspace_id).filter(Boolean)
  ).size;
  const criticalErrors = events.filter(
    (event) => event.event_type === "error" && (event.severity === "error" || event.severity === "critical")
  ).length;
  const workspaceBase = Math.max(1, uniqueWorkspaces7Days);
  const funnel = activationFunnelSteps.map((step) => {
    const workspaces = new Set(
      recentEvents
        .filter((event) => {
          if (event.event_name !== "funnel_step_viewed" && event.event_name !== "page_view") {
            return false;
          }

          const route = event.route ?? "";
          const stepKey = event.properties?.step;
          return stepKey === step.key || step.routes.some((prefix) => route === prefix || route.startsWith(`${prefix}/`));
        })
        .map((event) => event.workspace_id)
        .filter(Boolean)
    );
    const count = workspaces.size;

    return {
      count,
      key: step.key,
      label: step.label,
      percentage: Math.min(100, Math.round((count / workspaceBase) * 100))
    };
  });
  const activationScore = funnel.length
    ? Math.round(funnel.reduce((total, step) => total + step.percentage, 0) / funnel.length)
    : 0;
  const routeCounts = new Map<string, number>();

  for (const event of events) {
    if (event.event_name === "page_view" && event.route) {
      routeCounts.set(event.route, (routeCounts.get(event.route) ?? 0) + 1);
    }
  }

  const topRoutes = Array.from(routeCounts.entries())
    .sort((left, right) => right[1] - left[1])
    .slice(0, 5)
    .map(([route, count]) => ({ count, route }));
  const latestErrors = events
    .filter((event) => event.event_type === "error")
    .sort((left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime())
    .slice(0, 5);

  return {
    activationScore,
    criticalErrors,
    eventsLast24Hours,
    funnel,
    latestErrors,
    topRoutes,
    uniqueUsers7Days,
    uniqueWorkspaces7Days
  };
}

export function resolveFunnelStep(pathname: string) {
  return activationFunnelSteps.find((step) =>
    step.routes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
  );
}

function normalizeEventName(value: string) {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "");

  return (normalized || "unknown_event").slice(0, 80);
}

function normalizeRoute(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const route = value.trim();
  if (!route.startsWith("/")) {
    return null;
  }

  return route.slice(0, 220);
}

function sanitizeProperties(properties: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(properties)
      .filter(([key]) => !isSensitiveKey(key))
      .slice(0, 20)
      .map(([key, value]) => [key.slice(0, 80), sanitizeValue(value)])
  );
}

function sanitizeValue(value: unknown): unknown {
  if (typeof value === "string") {
    return value.slice(0, 240);
  }

  if (typeof value === "number" || typeof value === "boolean" || value === null) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.slice(0, 10).map(sanitizeValue);
  }

  if (typeof value === "object" && value) {
    return sanitizeProperties(value as Record<string, unknown>);
  }

  return String(value).slice(0, 120);
}

function isSensitiveKey(key: string) {
  const normalized = key.toLowerCase();
  return (
    normalized.includes("password") ||
    normalized.includes("token") ||
    normalized.includes("secret") ||
    normalized.includes("key") ||
    normalized.includes("email") ||
    normalized.includes("cpf") ||
    normalized.includes("document")
  );
}
