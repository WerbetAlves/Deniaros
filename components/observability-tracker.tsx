"use client";

import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef } from "react";
import { resolveFunnelStep, type ObservabilityEventType, type ObservabilitySeverity } from "@/lib/observability";

type TrackPayload = {
  eventName: string;
  eventType: ObservabilityEventType;
  properties?: Record<string, unknown>;
  route?: string;
  severity?: ObservabilitySeverity;
  workspaceId?: string;
};

export function ObservabilityTracker({
  enabled,
  workspaceId
}: {
  enabled: boolean;
  workspaceId?: string;
}) {
  const pathname = usePathname();
  const sessionKey = useMemo(() => getSessionKey(), []);
  const previousPathname = useRef<string | null>(null);

  useEffect(() => {
    if (!enabled || !pathname || previousPathname.current === pathname) {
      return;
    }

    previousPathname.current = pathname;
    const funnelStep = resolveFunnelStep(pathname);

    trackEvent({
      eventName: "page_view",
      eventType: "pageview",
      properties: {
        referrer: document.referrer ? new URL(document.referrer).pathname : null
      },
      route: pathname,
      workspaceId
    }, sessionKey);

    if (funnelStep) {
      trackEvent({
        eventName: "funnel_step_viewed",
        eventType: "funnel",
        properties: {
          step: funnelStep.key,
          stepLabel: funnelStep.label
        },
        route: pathname,
        workspaceId
      }, sessionKey);
    }
  }, [enabled, pathname, sessionKey, workspaceId]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const handleError = (event: ErrorEvent) => {
      trackEvent({
        eventName: "client_runtime_error",
        eventType: "error",
        properties: {
          column: event.colno,
          filename: event.filename,
          line: event.lineno,
          message: event.message
        },
        route: window.location.pathname,
        severity: "error",
        workspaceId
      }, sessionKey);
    };
    const handleRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason instanceof Error ? event.reason.message : String(event.reason);

      trackEvent({
        eventName: "client_unhandled_rejection",
        eventType: "error",
        properties: {
          message: reason
        },
        route: window.location.pathname,
        severity: "error",
        workspaceId
      }, sessionKey);
    };

    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleRejection);

    return () => {
      window.removeEventListener("error", handleError);
      window.removeEventListener("unhandledrejection", handleRejection);
    };
  }, [enabled, sessionKey, workspaceId]);

  return null;
}

export function trackClientObservabilityEvent(payload: TrackPayload) {
  trackEvent(payload, getSessionKey());
}

function trackEvent(payload: TrackPayload, sessionKey: string) {
  const body = JSON.stringify({
    ...payload,
    sessionKey
  });

  if (navigator.sendBeacon) {
    const blob = new Blob([body], { type: "application/json" });
    navigator.sendBeacon("/api/observability/track", blob);
    return;
  }

  void fetch("/api/observability/track", {
    body,
    headers: {
      "Content-Type": "application/json"
    },
    keepalive: true,
    method: "POST"
  });
}

function getSessionKey() {
  const storageKey = "deniaros_observability_session";

  try {
    const existing = window.sessionStorage.getItem(storageKey);

    if (existing) {
      return existing;
    }

    const next =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

    window.sessionStorage.setItem(storageKey, next);
    return next;
  } catch {
    return "session-unavailable";
  }
}
