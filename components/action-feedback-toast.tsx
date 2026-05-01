"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

const AUTO_HIDE_MS = 3200;

export function ActionFeedbackToast() {
  const searchParams = useSearchParams();
  const success = searchParams.get("success");
  const [message, setMessage] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!success) {
      setVisible(false);
      return;
    }

    setMessage(success);
    setVisible(true);

    const timeout = window.setTimeout(() => {
      setVisible(false);
    }, AUTO_HIDE_MS);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [success]);

  if (!message || !visible) {
    return null;
  }

  return (
    <aside className="action-feedback-toast" role="status" aria-live="polite">
      <span className="action-feedback-icon">✓</span>
      <div>
        <strong>Confirmado</strong>
        <p>{message}</p>
      </div>
      <button
        aria-label="Fechar mensagem"
        className="action-feedback-close"
        onClick={() => setVisible(false)}
        type="button"
      >
        ×
      </button>
    </aside>
  );
}
