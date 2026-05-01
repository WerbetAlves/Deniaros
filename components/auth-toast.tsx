"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type AuthToastProps = {
  description: string;
  kind: "error" | "success";
  title: string;
};

export function AuthToast({ description, kind, title }: AuthToastProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      dismissToast();
    }, 10000);

    return () => window.clearTimeout(timeoutId);
  });

  function dismissToast() {
    setVisible(false);

    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.delete("error");
    nextParams.delete("message");

    const nextQuery = nextParams.toString();
    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, {
      scroll: false
    });
  }

  if (!visible) {
    return null;
  }

  return (
    <div className={`auth-toast auth-toast-${kind}`} role="status">
      <div>
        <strong>{title}</strong>
        <p>{description}</p>
      </div>
      <button
        aria-label="Fechar aviso"
        className="auth-toast-close"
        onClick={dismissToast}
        type="button"
      >
        x
      </button>
    </div>
  );
}
