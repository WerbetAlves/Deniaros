"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { HelpCenter } from "@/components/help-center";
import { navigation, type NavigationItem } from "@/lib/navigation";

export type TopbarNoticeTone = "info" | "warning" | "danger" | "success";

export type TopbarNotice = {
  id: string;
  title: string;
  description: string;
  href?: string;
  tone: TopbarNoticeTone;
};

export type TopbarPlanTier = "bronze" | "silver" | "gold" | "platinum";

const planTierLabels: Record<TopbarPlanTier, string> = {
  bronze: "Bronze",
  silver: "Prata",
  gold: "Ouro",
  platinum: "Platina"
};

export function Topbar({
  notices,
  planLabel,
  planTier = "silver"
}: {
  notices: TopbarNotice[];
  planLabel?: string;
  planTier?: TopbarPlanTier;
}) {
  const pathname = usePathname();
  const section = resolveSection(pathname);
  const alertTone = resolveHighestTone(notices);
  const noticeCountLabel = `${notices.length} ${notices.length === 1 ? "aviso" : "avisos"}`;

  return (
    <header className={`topbar topbar-refined topbar-plan-${planTier}`}>
      <div className="topbar-title-wrap">
        <p className="topbar-eyebrow">Área atual</p>
        <h2>{section.label}</h2>
        <p className="topbar-subtitle">{section.description}</p>
      </div>

      <div className="topbar-tools">
        <span className="topbar-plan-chip">{planLabel ?? `Plano ${planTierLabels[planTier]}`}</span>
        <HelpCenter />
        <details className="topbar-notification-box">
          <summary
            aria-label={`Abrir notificações: ${noticeCountLabel}`}
            className="topbar-icon-button"
            title="Notificações"
          >
            <BellIcon />
            <span className={`topbar-alert-dot ${alertTone}`} />
            <span className="sr-only">{noticeCountLabel}</span>
          </summary>

          <div className="topbar-notification-menu">
            <p className="section-label">Notificações</p>
            <div className="topbar-notification-list">
              {notices.map((notice) => (
                <article className={`topbar-notice topbar-notice-${notice.tone}`} key={notice.id}>
                  <strong>{notice.title}</strong>
                  <p>{notice.description}</p>
                  {notice.href ? (
                    <Link className="topbar-notice-link" href={notice.href}>
                      Abrir
                    </Link>
                  ) : null}
                </article>
              ))}
            </div>
          </div>
        </details>
      </div>
    </header>
  );
}

function resolveHighestTone(notices: TopbarNotice[]) {
  const priority: Record<TopbarNoticeTone, number> = {
    success: 0,
    info: 1,
    warning: 2,
    danger: 3
  };

  const maxTone = notices.reduce<TopbarNoticeTone>(
    (current, notice) =>
      priority[notice.tone] > priority[current] ? notice.tone : current,
    "success"
  );

  return maxTone;
}

function resolveSection(pathname: string): Pick<NavigationItem, "label" | "description"> {
  const section = navigation.find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`));

  if (section) {
    return section;
  }

  if (pathname.startsWith("/transactions/new")) {
    return {
      label: "Novo movimento",
      description: "Registre uma entrada, saída ou transferência sem perder o contexto do fluxo."
    };
  }

  if (pathname.startsWith("/transactions")) {
    return {
      label: "Lançamentos",
      description: "Consulte, filtre e ajuste os movimentos que alimentam sua visão financeira."
    };
  }

  if (pathname.startsWith("/personal-profile")) {
    return {
      label: "Perfil pessoal",
      description: "Preferências e dados que ajudam o Deniaros a personalizar sua experiência."
    };
  }

  if (pathname.startsWith("/imports")) {
    return {
      label: "Importação",
      description: "Traga extratos CSV ou QIF com revisão, regras e conferência antes de lançar."
    };
  }

  if (pathname.startsWith("/billing")) {
    return {
      label: "Planos e assinatura",
      description: "Veja seu plano atual, adicionais familiares e detalhes de cobrança."
    };
  }

  if (pathname.startsWith("/home-inventory")) {
    return {
      label: "Inventário doméstico",
      description: "Organize bens, valores e itens importantes do patrimônio familiar."
    };
  }

  if (pathname.startsWith("/tax-categories")) {
    return {
      label: "Categorias de imposto",
      description: "Classifique lançamentos para relatórios fiscais e conferências futuras."
    };
  }

  return {
    label: "Deniaros",
    description: "Gestão financeira inteligente, previsível e organizada."
  };
}

function BellIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M12 5a5 5 0 0 0-5 5v2.8l-1.4 2.6h12.8L17 12.8V10a5 5 0 0 0-5-5z" />
      <path d="M10 18a2 2 0 0 0 4 0" />
    </svg>
  );
}
