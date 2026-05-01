import type { FinancialData } from "@/lib/financial-data";

export function DataSourceBanner({
  fallbackReason,
  source
}: {
  fallbackReason?: string;
  source: FinancialData["source"];
}) {
  if (source === "supabase") {
    return null;
  }

  return (
    <section className="source-banner">
      <strong>Modo demonstração</strong>
      <span>
        {fallbackReason
          ? `Dados reais indisponíveis: ${fallbackReason}`
          : "Sem dados reais carregados. Usando amostra local."}
      </span>
    </section>
  );
}
