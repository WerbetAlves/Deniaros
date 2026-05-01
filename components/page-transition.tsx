"use client";

import type { CSSProperties, ReactNode } from "react";
import { usePathname } from "next/navigation";

export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const palette = getTransitionPalette(pathname);
  const transitionStyle = {
    "--route-sweep": palette.sweep,
    "--route-topline": palette.topline
  } as CSSProperties;

  return (
    <div className="page-transition-shell" key={pathname} style={transitionStyle}>
      {children}
    </div>
  );
}

function getTransitionPalette(pathname: string) {
  if (pathname.startsWith("/transactions")) {
    return {
      sweep: "rgba(49, 94, 109, 0.28)",
      topline: "linear-gradient(90deg, rgba(49, 94, 109, 0), rgba(49, 94, 109, 0.9), rgba(49, 94, 109, 0))"
    };
  }

  if (pathname.startsWith("/accounts")) {
    return {
      sweep: "rgba(45, 104, 75, 0.28)",
      topline: "linear-gradient(90deg, rgba(45, 104, 75, 0), rgba(45, 104, 75, 0.9), rgba(45, 104, 75, 0))"
    };
  }

  if (pathname.startsWith("/reports") || pathname.startsWith("/investments")) {
    return {
      sweep: "rgba(184, 137, 56, 0.3)",
      topline: "linear-gradient(90deg, rgba(184, 137, 56, 0), rgba(184, 137, 56, 0.92), rgba(184, 137, 56, 0))"
    };
  }

  return {
    sweep: "rgba(40, 90, 67, 0.24)",
    topline: "linear-gradient(90deg, rgba(40, 90, 67, 0), rgba(40, 90, 67, 0.82), rgba(40, 90, 67, 0))"
  };
}
