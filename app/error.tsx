"use client";

import { useEffect } from "react";

export default function AppError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    void fetch("/api/observability/track", {
      body: JSON.stringify({
        eventName: "app_route_error",
        eventType: "error",
        properties: {
          digest: error.digest ?? null,
          message: error.message
        },
        route: window.location.pathname,
        severity: "critical"
      }),
      headers: {
        "Content-Type": "application/json"
      },
      method: "POST"
    });
  }, [error.digest, error.message]);

  return (
    <main className="error-boundary-shell">
      <section className="panel error-boundary-card">
        <p className="section-label">Falha operacional</p>
        <h1>Algo interrompeu esta tela.</h1>
        <p className="supporting-copy">
          Registramos o erro para análise. Você pode tentar recarregar esta área sem sair do
          Deniaros.
        </p>
        <button className="primary-button" onClick={reset} type="button">
          Tentar novamente
        </button>
      </section>
    </main>
  );
}
