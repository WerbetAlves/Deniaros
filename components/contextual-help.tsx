import { Info, Sparkles } from "lucide-react";
import Link from "next/link";

type ContextualHelpProps = {
  aiPrompt?: string;
  className?: string;
  tooltip: string;
};

export function ContextualHelp({ aiPrompt, className, tooltip }: ContextualHelpProps) {
  const classes = ["contextual-help", className].filter(Boolean).join(" ");
  const assistantHref = aiPrompt ? `/assistant?question=${encodeURIComponent(aiPrompt)}` : null;

  return (
    <span className={classes}>
      <span aria-label={tooltip} className="widget-info" tabIndex={0}>
        <Info aria-hidden="true" size={14} strokeWidth={2.4} />
        <span className="widget-info-bubble" role="tooltip">
          {tooltip}
        </span>
      </span>
      {assistantHref ? (
        <Link aria-label="Perguntar ao Consultor IA" className="contextual-help-ai" href={assistantHref}>
          <Sparkles aria-hidden="true" size={14} strokeWidth={2.4} />
        </Link>
      ) : null}
    </span>
  );
}
