import { Info } from "lucide-react";
import type { ElementType, ReactNode } from "react";

type WidgetTone = "default" | "stable" | "attention" | "danger" | "accent";

type WidgetWrapperProps = {
  as?: ElementType;
  children: ReactNode;
  className?: string;
  label?: string;
  title?: ReactNode;
  tooltip?: string;
  tone?: WidgetTone;
  toolbar?: ReactNode;
};

export function WidgetWrapper({
  as,
  children,
  className,
  label,
  title,
  tooltip,
  tone = "default",
  toolbar
}: WidgetWrapperProps) {
  const Element = as ?? "article";
  const classes = ["widget-wrapper", `widget-${tone}`, className].filter(Boolean).join(" ");

  return (
    <Element className={classes}>
      {(label || title || tooltip || toolbar) ? (
        <header className="widget-wrapper-head">
          <div>
            {label ? <p className="section-label">{label}</p> : null}
            {title ? <h3>{title}</h3> : null}
          </div>
          <div className="widget-wrapper-tools">
            {tooltip ? (
              <span aria-label={tooltip} className="widget-info" tabIndex={0}>
                <Info aria-hidden="true" size={14} strokeWidth={2.4} />
                <span className="widget-info-bubble" role="tooltip">
                  {tooltip}
                </span>
              </span>
            ) : null}
            {toolbar}
          </div>
        </header>
      ) : null}
      <div className="widget-wrapper-body">{children}</div>
    </Element>
  );
}

export function MetricValue({
  children,
  tone = "default"
}: {
  children: ReactNode;
  tone?: WidgetTone;
}) {
  return <strong className={`metric-value metric-${tone}`}>{children}</strong>;
}
