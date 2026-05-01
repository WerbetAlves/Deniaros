"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { AccountBalance, CurrencyCode, ForecastProjection, LocaleCode } from "@/lib/domain";
import { formatCurrency, formatShortDate } from "@/lib/finance";

type HomeModuleId = "reminders" | "chart" | "tip" | "accounts" | "internet";

type HomeModule = {
  id: HomeModuleId;
  title: string;
  description: string;
};

type Reminder = {
  id: string;
  title: string;
  description: string;
  href: string;
  tone: "calm" | "attention" | "danger";
};

const moduleCatalog: HomeModule[] = [
  {
    id: "reminders",
    title: "Lembretes inteligentes",
    description: "O que merece acao antes de virar urgencia."
  },
  {
    id: "chart",
    title: "Grafico do dia",
    description: "Uma leitura visual alternada para provocar decisao."
  },
  {
    id: "tip",
    title: "Dica do dia",
    description: "Um habito pratico para melhorar o uso do sistema."
  },
  {
    id: "accounts",
    title: "Saldos das contas",
    description: "Carteiras favoritas e posicao atual em um olhar."
  },
  {
    id: "internet",
    title: "Sinais externos",
    description: "Base para noticias, Open Finance e avisos do mercado."
  }
];

const defaultOrder: HomeModuleId[] = ["reminders", "chart", "tip", "accounts", "internet"];
const preferencesKey = "deniaros-home-modules-v1";

const dailyTips = [
  "Registre o movimento no dia em que ele acontece. O historico fica mais limpo e a IA recomenda melhor.",
  "Antes de comprar algo parcelado, confira o menor saldo previsto dos proximos 90 dias.",
  "Nomeie contas pelo uso real. Isso deixa busca, importacao e relatorios mais rapidos.",
  "Uma categoria boa responde uma pergunta. Se ela nao ajuda a decidir, talvez esteja ampla demais.",
  "Feche a semana pela agenda financeira: contas vencidas, proximos depositos e saldo projetado."
];

export function FinancialHomePersonalizer({
  accountBalances,
  baseCurrency,
  hasPersonalProfile,
  importedCount,
  locale,
  openScheduledCount,
  projection,
  transactionCount
}: {
  accountBalances: AccountBalance[];
  baseCurrency: CurrencyCode;
  hasPersonalProfile: boolean;
  importedCount: number;
  locale: LocaleCode;
  openScheduledCount: number;
  projection: ForecastProjection;
  transactionCount: number;
}) {
  const [moduleOrder, setModuleOrder] = useState<HomeModuleId[]>(defaultOrder);
  const [visibleModules, setVisibleModules] = useState<HomeModuleId[]>(defaultOrder);

  useEffect(() => {
    try {
      const rawPreferences = window.localStorage.getItem(preferencesKey);
      if (!rawPreferences) {
        return;
      }

      const parsed = JSON.parse(rawPreferences) as {
        order?: HomeModuleId[];
        visible?: HomeModuleId[];
      };
      const validIds = new Set(moduleCatalog.map((module) => module.id));
      const storedOrder = parsed.order?.filter((id) => validIds.has(id)) ?? [];
      const storedVisible = parsed.visible?.filter((id) => validIds.has(id)) ?? [];

      setModuleOrder([...storedOrder, ...defaultOrder.filter((id) => !storedOrder.includes(id))]);
      setVisibleModules(storedVisible.length ? storedVisible : defaultOrder);
    } catch {
      setModuleOrder(defaultOrder);
      setVisibleModules(defaultOrder);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(
      preferencesKey,
      JSON.stringify({ order: moduleOrder, visible: visibleModules })
    );
  }, [moduleOrder, visibleModules]);

  const dayIndex = useMemo(() => getDayOfYear(new Date()), []);
  const tip = dailyTips[dayIndex % dailyTips.length];
  const chartMode = dayIndex % 3;
  const reminders = buildReminders({
    hasPersonalProfile,
    locale,
    openScheduledCount,
    projection,
    transactionCount
  });
  const visibleOrderedModules = moduleOrder.filter((id) => visibleModules.includes(id));

  function toggleModule(moduleId: HomeModuleId) {
    setVisibleModules((current) =>
      current.includes(moduleId)
        ? current.filter((id) => id !== moduleId)
        : [...current, moduleId]
    );
  }

  function moveModule(moduleId: HomeModuleId, direction: -1 | 1) {
    setModuleOrder((current) => {
      const next = [...current];
      const index = next.indexOf(moduleId);
      const targetIndex = index + direction;

      if (index < 0 || targetIndex < 0 || targetIndex >= next.length) {
        return current;
      }

      [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
      return next;
    });
  }

  return (
    <section className="financial-home-panel panel" aria-labelledby="financial-home-title">
      <div className="financial-home-head">
        <div>
          <p className="section-label">Home page financeira</p>
          <h3 id="financial-home-title">Uma tela que muda com sua vida financeira</h3>
          <p className="supporting-copy">
            A Home deixa de ser vitrine e vira mesa de decisao: lembretes, grafico do dia,
            saldos e dicas aparecem conforme o que precisa de atencao agora.
          </p>
        </div>
        <div className="home-preference-card">
          <p className="section-label">Personalizacao local</p>
          <strong>{visibleModules.length} de {moduleCatalog.length} blocos ativos</strong>
          <p>Escolha o que aparece e ajuste a ordem sem sair da tela inicial.</p>
        </div>
      </div>

      <div className="home-layout-builder" aria-label="Personalizar blocos da Home">
        {moduleCatalog.map((module) => {
          const active = visibleModules.includes(module.id);
          return (
            <article className={`home-module-toggle${active ? " active" : ""}`} key={module.id}>
              <button
                aria-pressed={active}
                className="home-toggle-main"
                onClick={() => toggleModule(module.id)}
                type="button"
              >
                <span>{module.title}</span>
                <small>{module.description}</small>
              </button>
              <div className="home-order-actions" aria-label={`Ordenar ${module.title}`}>
                <button onClick={() => moveModule(module.id, -1)} type="button">Subir</button>
                <button onClick={() => moveModule(module.id, 1)} type="button">Descer</button>
              </div>
            </article>
          );
        })}
      </div>

      <div className="financial-home-modules">
        {visibleOrderedModules.map((moduleId) => {
          if (moduleId === "reminders") {
            return <ReminderModule key={moduleId} reminders={reminders} />;
          }

          if (moduleId === "chart") {
            return (
              <ChartOfDayModule
                accountBalances={accountBalances}
                baseCurrency={baseCurrency}
                chartMode={chartMode}
                key={moduleId}
                locale={locale}
                projection={projection}
              />
            );
          }

          if (moduleId === "tip") {
            return <TipModule key={moduleId} tip={tip} />;
          }

          if (moduleId === "accounts") {
            return (
              <AccountsModule
                accountBalances={accountBalances}
                key={moduleId}
                locale={locale}
              />
            );
          }

          return (
            <ExternalSignalsModule
              importedCount={importedCount}
              key={moduleId}
              transactionCount={transactionCount}
            />
          );
        })}
      </div>
    </section>
  );
}

function ReminderModule({ reminders }: { reminders: Reminder[] }) {
  return (
    <article className="home-dynamic-module home-reminders-module">
      <div className="module-mini-head">
        <p className="section-label">Lembretes</p>
        <span>{reminders.length} ativo(s)</span>
      </div>
      <div className="home-reminder-list">
        {reminders.map((reminder) => (
          <Link className={`home-reminder-item ${reminder.tone}`} href={reminder.href} key={reminder.id}>
            <strong>{reminder.title}</strong>
            <p>{reminder.description}</p>
          </Link>
        ))}
      </div>
    </article>
  );
}

function ChartOfDayModule({
  accountBalances,
  baseCurrency,
  chartMode,
  locale,
  projection
}: {
  accountBalances: AccountBalance[];
  baseCurrency: CurrencyCode;
  chartMode: number;
  locale: LocaleCode;
  projection: ForecastProjection;
}) {
  const title =
    chartMode === 0
      ? "Projecao de saldo"
      : chartMode === 1
        ? "Saldos por carteira"
        : "Pontos de controle";
  const subtitle =
    chartMode === 0
      ? "Linha diaria dos proximos 90 dias."
      : chartMode === 1
        ? "Distribuicao atual por conta."
        : "Hoje, 7, 30, 60 e 90 dias.";

  return (
    <article className="home-dynamic-module home-chart-module">
      <div className="module-mini-head">
        <div>
          <p className="section-label">Grafico do dia</p>
          <h4>{title}</h4>
        </div>
        <span>{subtitle}</span>
      </div>
      {chartMode === 1 ? (
        <AccountBars accounts={accountBalances} locale={locale} />
      ) : (
        <ForecastLine baseCurrency={baseCurrency} locale={locale} projection={projection} compact={chartMode === 2} />
      )}
    </article>
  );
}

function TipModule({ tip }: { tip: string }) {
  return (
    <article className="home-dynamic-module home-tip-module">
      <p className="section-label">Dica do dia</p>
      <strong>{tip}</strong>
      <p>Pequenos habitos mantem o sistema vivo e fazem o passado trabalhar pelo futuro.</p>
      <Link className="ghost-button" href="/assistant">
        Pedir orientacao a IA
      </Link>
    </article>
  );
}

function AccountsModule({
  accountBalances,
  locale
}: {
  accountBalances: AccountBalance[];
  locale: LocaleCode;
}) {
  const favoriteAccounts = accountBalances.slice(0, 4);

  return (
    <article className="home-dynamic-module home-accounts-module">
      <div className="module-mini-head">
        <p className="section-label">Saldos das contas</p>
        <Link href="/accounts">Abrir carteiras</Link>
      </div>
      {favoriteAccounts.length ? (
        <div className="home-account-list">
          {favoriteAccounts.map((account) => (
            <div className="home-account-row" key={account.id}>
              <span style={{ background: account.color }} />
              <div>
                <strong>{account.name}</strong>
                <small>{account.type}</small>
              </div>
              <b>{formatCurrency(account.currentBalance, account.currency, locale)}</b>
            </div>
          ))}
        </div>
      ) : (
        <div className="home-empty-copy">
          <strong>Nenhuma carteira cadastrada.</strong>
          <p>Crie sua primeira conta para a Home acompanhar seus saldos favoritos.</p>
        </div>
      )}
    </article>
  );
}

function ExternalSignalsModule({
  importedCount,
  transactionCount
}: {
  importedCount: number;
  transactionCount: number;
}) {
  return (
    <article className="home-dynamic-module home-signals-module">
      <p className="section-label">Sinais externos</p>
      <h4>Base para Open Finance, extratos e informes</h4>
      <p>
        O Money trazia noticias e links da internet. No Deniaros, esse espaco prepara
        conexoes bancarias, importacoes revisadas e avisos de contexto financeiro.
      </p>
      <div className="home-signal-grid">
        <span>{importedCount} importado(s)</span>
        <span>{transactionCount} movimento(s)</span>
      </div>
      <Link className="ghost-button" href="/imports">
        Revisar importacoes
      </Link>
    </article>
  );
}

function ForecastLine({
  baseCurrency,
  compact,
  locale,
  projection
}: {
  baseCurrency: CurrencyCode;
  compact: boolean;
  locale: LocaleCode;
  projection: ForecastProjection;
}) {
  const points = compact ? projection.checkpoints : projection.dailyPoints.filter((_, index) => index % 6 === 0);
  const values = points.map((point) => point.balance);
  const min = Math.min(...values, 0);
  const max = Math.max(...values, 1);
  const range = Math.max(max - min, 1);
  const width = 620;
  const height = 190;
  const coordinates = points.map((point, index) => {
    const x = 22 + (index / Math.max(points.length - 1, 1)) * (width - 44);
    const y = height - 24 - ((point.balance - min) / range) * (height - 48);
    return { ...point, x, y };
  });
  const path = coordinates.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
  const area = `${path} L ${width - 22} ${height - 24} L 22 ${height - 24} Z`;
  const finalPoint = points.at(-1);

  return (
    <div className="home-chart-canvas">
      <svg aria-label="Grafico de previsao da Home" role="img" viewBox={`0 0 ${width} ${height}`}>
        <line className="home-chart-grid" x1="22" x2={width - 22} y1={height - 24} y2={height - 24} />
        <path className="home-chart-area" d={area} />
        <path className="home-chart-line" d={path} />
        {coordinates.map((point) => (
          <circle className="home-chart-point" cx={point.x} cy={point.y} key={point.date} r="4" />
        ))}
      </svg>
      <div className="home-chart-summary">
        <span>{finalPoint ? formatShortDate(finalPoint.date, locale) : "Hoje"}</span>
        <strong>{formatCurrency(finalPoint?.balance ?? 0, baseCurrency, locale)}</strong>
      </div>
    </div>
  );
}

function AccountBars({ accounts, locale }: { accounts: AccountBalance[]; locale: LocaleCode }) {
  const visibleAccounts = accounts.slice(0, 5);
  const maxAbs = Math.max(...visibleAccounts.map((account) => Math.abs(account.currentBalance)), 1);

  return (
    <div className="home-account-bars">
      {visibleAccounts.length ? (
        visibleAccounts.map((account) => (
          <div className="home-account-bar-row" key={account.id}>
            <span>{account.name}</span>
            <div>
              <i style={{ width: `${Math.max(8, (Math.abs(account.currentBalance) / maxAbs) * 100)}%` }} />
            </div>
            <strong>{formatCurrency(account.currentBalance, account.currency, locale)}</strong>
          </div>
        ))
      ) : (
        <p>Nenhuma conta cadastrada para montar o grafico.</p>
      )}
    </div>
  );
}

function buildReminders({
  hasPersonalProfile,
  locale,
  openScheduledCount,
  projection,
  transactionCount
}: {
  hasPersonalProfile: boolean;
  locale: LocaleCode;
  openScheduledCount: number;
  projection: ForecastProjection;
  transactionCount: number;
}) {
  const reminders: Reminder[] = [];

  if (!hasPersonalProfile) {
    reminders.push({
      id: "profile",
      title: "Complete seu Perfil Pessoal",
      description: "A Home fica mais precisa quando entende sua renda, objetivos e rotina.",
      href: "/personal-profile",
      tone: "attention"
    });
  }

  if (transactionCount === 0) {
    reminders.push({
      id: "first-transaction",
      title: "Registre o primeiro movimento",
      description: "Sem historico, a Home ainda nao consegue identificar padroes.",
      href: "/transactions/new",
      tone: "attention"
    });
  }

  const overdueCount = projection.events.filter((event) => event.isOverdue).length;

  if (overdueCount > 0) {
    reminders.push({
      id: "overdue",
      title: `${overdueCount} compromisso${overdueCount === 1 ? "" : "s"} em atraso`,
      description: "De baixa, reprograme ou ajuste antes que a previsao fique distorcida.",
      href: "/financial-agenda",
      tone: "danger"
    });
  } else if (openScheduledCount > 0) {
    reminders.push({
      id: "schedule",
      title: `${openScheduledCount} compromisso${openScheduledCount === 1 ? "" : "s"} em aberto`,
      description: "Acompanhe vencimentos e depositos antes de assumir novos gastos.",
      href: "/financial-agenda",
      tone: "calm"
    });
  }

  if (projection.summary.riskLevel !== "stable") {
    reminders.push({
      id: "forecast-risk",
      title: "Previsao pede atencao",
      description: `Menor saldo previsto em ${formatShortDate(projection.summary.lowestDate, locale)}.`,
      href: "/financial-agenda",
      tone: projection.summary.riskLevel === "danger" ? "danger" : "attention"
    });
  }

  if (!reminders.length) {
    reminders.push({
      id: "all-good",
      title: "Tudo em ordem por enquanto",
      description: "Use a dica e o grafico do dia para melhorar o proximo ciclo financeiro.",
      href: "/reports",
      tone: "calm"
    });
  }

  return reminders.slice(0, 4);
}

function getDayOfYear(date: Date) {
  const start = new Date(date.getFullYear(), 0, 0);
  return Math.floor((date.getTime() - start.getTime()) / 86400000);
}
