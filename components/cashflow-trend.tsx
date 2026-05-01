"use client";

import { useEffect, useMemo, useState } from "react";
import type { CurrencyCode, LocaleCode, Transaction } from "@/lib/domain";
import { formatCurrency } from "@/lib/finance";

type CashflowTrendProps = {
  transactions: Transaction[];
  baseCurrency: CurrencyCode;
  locale: LocaleCode;
};

type TimeRangeKey = "year" | "month" | "week" | "day";

type CashflowPoint = {
  key: string;
  label: string;
  income: number;
  expense: number;
  net: number;
};

const timeRangeOptions: Array<{
  id: TimeRangeKey;
  label: string;
  title: string;
}> = [
  { id: "year", label: "Ano", title: "Visão anual" },
  { id: "month", label: "Mês", title: "Visão mensal" },
  { id: "week", label: "Semana", title: "Visão semanal" },
  { id: "day", label: "Dia", title: "Visão diária" }
];

const chartWidth = 980;
const chartHeight = 280;
const chartPaddingX = 30;
const chartPaddingY = 18;

export function CashflowTrend({ transactions, baseCurrency, locale }: CashflowTrendProps) {
  const [timeRange, setTimeRange] = useState<TimeRangeKey>("month");
  const seriesByRange = useMemo(
    () => ({
      year: buildSeries(transactions, "year", locale, 6),
      month: buildSeries(transactions, "month", locale, 12),
      week: buildSeries(transactions, "week", locale, 12),
      day: buildSeries(transactions, "day", locale, 14)
    }),
    [transactions, locale]
  );
  const points = seriesByRange[timeRange];
  const [activeIndex, setActiveIndex] = useState(Math.max(0, points.length - 1));

  useEffect(() => {
    setActiveIndex(Math.max(0, points.length - 1));
  }, [timeRange, points.length]);

  const safeIndex = Math.min(Math.max(activeIndex, 0), Math.max(0, points.length - 1));
  const activePoint =
    points[safeIndex] ??
    ({
      income: 0,
      expense: 0,
      key: "none",
      label: "--",
      net: 0
    } as CashflowPoint);
  const previousPoint = safeIndex > 0 ? points[safeIndex - 1] : undefined;
  const netDelta = activePoint.net - (previousPoint?.net ?? 0);
  const deltaLabel = previousPoint
    ? `${netDelta >= 0 ? "+" : ""}${formatCurrency(netDelta, baseCurrency, locale)} vs período anterior`
    : "Primeiro período da serie";

  const chartGeometry = useMemo(
    () => buildChartGeometry(points.map((point) => point.net)),
    [points]
  );

  return (
    <section className="panel cashflow-panel">
      <div className="panel-header">
        <div>
          <p className="section-label">Fluxo de caixa interativo</p>
          <h3>Ritmo financeiro com visão dinâmica</h3>
        </div>
        <div className="cashflow-range-switch" role="tablist" aria-label="Visão temporal do fluxo">
          {timeRangeOptions.map((option) => (
            <button
              aria-selected={timeRange === option.id}
              className={`cashflow-range-button${timeRange === option.id ? " active" : ""}`}
              key={option.id}
              onClick={() => setTimeRange(option.id)}
              role="tab"
              title={option.title}
              type="button"
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="cashflow-legend">
        <span>
          <i className="cashflow-dot income" /> Entradas
        </span>
        <span>
          <i className="cashflow-dot expense" /> Saídas
        </span>
        <span className={`status-chip ${activePoint.net >= 0 ? "status-positive" : "status-danger"}`}>
          {activePoint.net >= 0 ? "Fluxo positivo" : "Fluxo pressionado"}
        </span>
      </div>

      <div className="cashflow-canvas">
        <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} role="img" aria-label="Grafico de fluxo de caixa">
          {chartGeometry.gridLines.map((tick, index) => (
            <g key={`grid-${index}`}>
              <line
                className="cashflow-grid-line"
                x1={chartPaddingX}
                x2={chartWidth - chartPaddingX}
                y1={tick.y}
                y2={tick.y}
              />
              <text className="cashflow-grid-label" x={8} y={tick.y + 4}>
                {formatAxisValue(tick.value, baseCurrency, locale)}
              </text>
            </g>
          ))}

          <line
            className="cashflow-baseline"
            x1={chartPaddingX}
            x2={chartWidth - chartPaddingX}
            y1={chartGeometry.baselineY}
            y2={chartGeometry.baselineY}
          />

          {points.length > 1 ? (
            <>
              <path className="cashflow-area" d={chartGeometry.areaPath} />
              <path className="cashflow-line" d={chartGeometry.linePath} />
            </>
          ) : null}

          {chartGeometry.points.map((point, index) => (
            <g key={points[index]?.key ?? `point-${index}`}>
              <circle
                className={`cashflow-point${index === safeIndex ? " active" : ""}`}
                cx={point.x}
                cy={point.y}
                onClick={() => setActiveIndex(index)}
                r={index === safeIndex ? 7 : 5}
              />
            </g>
          ))}
        </svg>
      </div>

      <div className="cashflow-point-list">
        {points.map((point, index) => (
          <button
            className={`cashflow-point-button${index === safeIndex ? " active" : ""}`}
            key={`point-button-${point.key}`}
            onClick={() => setActiveIndex(index)}
            type="button"
          >
            {point.label}
          </button>
        ))}
      </div>

      <div className="cashflow-stat-grid">
        <article className="cashflow-stat-card">
          <p className="mini-label">Período selecionado</p>
          <strong>{activePoint.label}</strong>
          <p>{deltaLabel}</p>
        </article>
        <article className="cashflow-stat-card">
          <p className="mini-label">Entradas</p>
          <strong className="text-positive">{formatCurrency(activePoint.income, baseCurrency, locale)}</strong>
          <p>Total de receitas no recorte atual.</p>
        </article>
        <article className="cashflow-stat-card">
          <p className="mini-label">Saídas</p>
          <strong className="text-negative">{formatCurrency(activePoint.expense, baseCurrency, locale)}</strong>
          <p>Total de despesas no recorte atual.</p>
        </article>
      </div>
    </section>
  );
}

function buildSeries(
  transactions: Transaction[],
  mode: TimeRangeKey,
  locale: LocaleCode,
  count: number
) {
  const today = new Date();
  const bucketStarts = createBucketStarts(today, mode, count);
  const buckets = new Map<string, { income: number; expense: number }>();

  for (const start of bucketStarts) {
    buckets.set(getBucketKey(start, mode), { expense: 0, income: 0 });
  }

  for (const transaction of transactions) {
    if (transaction.transferAccountId) {
      continue;
    }

    const transactionDate = parseIsoDate(transaction.date);
    const key = getBucketKey(transactionDate, mode);
    const bucket = buckets.get(key);

    if (!bucket) {
      continue;
    }

    if (transaction.amount >= 0) {
      bucket.income += transaction.amount;
    } else {
      bucket.expense += Math.abs(transaction.amount);
    }
  }

  return bucketStarts.map((startDate) => {
    const key = getBucketKey(startDate, mode);
    const values = buckets.get(key) ?? { expense: 0, income: 0 };

    return {
      expense: values.expense,
      income: values.income,
      key,
      label: formatBucketLabel(startDate, mode, locale),
      net: values.income - values.expense
    } as CashflowPoint;
  });
}

function createBucketStarts(today: Date, mode: TimeRangeKey, count: number) {
  const points: Date[] = [];

  for (let index = count - 1; index >= 0; index -= 1) {
    if (mode === "day") {
      points.push(new Date(today.getFullYear(), today.getMonth(), today.getDate() - index, 12, 0, 0));
      continue;
    }

    if (mode === "week") {
      const day = new Date(today.getFullYear(), today.getMonth(), today.getDate() - index * 7, 12, 0, 0);
      points.push(getWeekStart(day));
      continue;
    }

    if (mode === "month") {
      points.push(new Date(today.getFullYear(), today.getMonth() - index, 1, 12, 0, 0));
      continue;
    }

    points.push(new Date(today.getFullYear() - index, 0, 1, 12, 0, 0));
  }

  return points;
}

function buildChartGeometry(values: number[]) {
  const innerWidth = chartWidth - chartPaddingX * 2;
  const innerHeight = chartHeight - chartPaddingY * 2;
  const maxValue = Math.max(0, ...values);
  const minValue = Math.min(0, ...values);
  const spread = Math.max(1, maxValue - minValue);

  const mapY = (value: number) =>
    chartPaddingY + innerHeight - ((value - minValue) / spread) * innerHeight;
  const mapX = (index: number) =>
    values.length <= 1
      ? chartPaddingX + innerWidth / 2
      : chartPaddingX + (index / (values.length - 1)) * innerWidth;

  const points = values.map((value, index) => ({
    x: mapX(index),
    y: mapY(value)
  }));
  const baselineY = mapY(0);
  const linePath = points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
    .join(" ");
  const areaPath =
    points.length > 1
      ? `M ${points[0].x.toFixed(2)} ${baselineY.toFixed(2)} ${linePath.replace("M ", "L ")} L ${points[points.length - 1].x.toFixed(2)} ${baselineY.toFixed(2)} Z`
      : "";

  const gridLines = Array.from({ length: 5 }, (_, index) => {
    const value = maxValue - ((maxValue - minValue) / 4) * index;
    return {
      value,
      y: mapY(value)
    };
  });

  return {
    areaPath,
    baselineY,
    gridLines,
    linePath,
    points
  };
}

function formatBucketLabel(date: Date, mode: TimeRangeKey, locale: LocaleCode) {
  if (mode === "year") {
    return String(date.getFullYear());
  }

  if (mode === "month") {
    return new Intl.DateTimeFormat(locale, { month: "short" }).format(date);
  }

  if (mode === "week") {
    return new Intl.DateTimeFormat(locale, { day: "2-digit", month: "2-digit" }).format(date);
  }

  return new Intl.DateTimeFormat(locale, { day: "2-digit", month: "2-digit" }).format(date);
}

function getBucketKey(date: Date, mode: TimeRangeKey) {
  if (mode === "year") {
    return String(date.getFullYear());
  }

  if (mode === "month") {
    return `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, "0")}`;
  }

  if (mode === "week") {
    const weekStart = getWeekStart(date);
    return `${weekStart.getFullYear()}-${`${weekStart.getMonth() + 1}`.padStart(2, "0")}-${`${weekStart.getDate()}`.padStart(2, "0")}`;
  }

  return `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, "0")}-${`${date.getDate()}`.padStart(2, "0")}`;
}

function getWeekStart(date: Date) {
  const weekStart = new Date(date);
  const dayOfWeek = weekStart.getDay();
  const shift = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  weekStart.setDate(weekStart.getDate() + shift);
  weekStart.setHours(12, 0, 0, 0);
  return weekStart;
}

function parseIsoDate(value: string) {
  return new Date(`${value}T12:00:00`);
}

function formatAxisValue(value: number, currency: CurrencyCode, locale: LocaleCode) {
  return new Intl.NumberFormat(locale, {
    currency,
    maximumFractionDigits: 1,
    notation: "compact",
    style: "currency"
  }).format(value);
}
