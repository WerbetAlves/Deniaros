import Link from "next/link";
import type { FinancialData } from "@/lib/financial-data";

export function DataSourceBanner({
  fallbackReason,
  source
}: {
  fallbackReason?: string;
  source: FinancialData["source"];
}) {
  if (source === "supabase" && !fallbackReason) {
    return null;
  }

  if (source === "sample") {
    return (
      <section className="source-banner">
        <strong>Modo demonstracao</strong>
        <span>
          {fallbackReason
            ? `Dados reais indisponiveis: ${fallbackReason}`
            : "Sem dados reais carregados. Usando amostra local."}
        </span>
      </section>
    );
  }

  return (
    <section className="source-banner source-banner-critical">
      <strong>Dados financeiros indisponiveis</strong>
      <span>
        Nao conseguimos carregar seus dados reais agora. Nada ficticio sera exibido nesta tela.
        {fallbackReason ? ` Motivo tecnico: ${fallbackReason}` : ""}
      </span>
      <Link href="/support?topic=technical">Pedir suporte</Link>
    </section>
  );
}
