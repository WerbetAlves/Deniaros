import Link from "next/link";

export function FloatingQuickActions() {
  return (
    <details aria-label="Ações rápidas do sistema" className="floating-quick-actions">
      <summary
        aria-label="Abrir ações rápidas"
        className="floating-quick-toggle"
        title="Ações rápidas"
      >
        <span aria-hidden="true">+</span>
      </summary>

      <nav aria-label="Ações rápidas" className="floating-quick-menu">
        <p className="floating-quick-heading">Criar ou acessar</p>
        <Link className="floating-quick-link" href="/assistant">
          Conversar com a IA
        </Link>
        <Link className="floating-quick-link" href="/transactions/new">
          Novo movimento
        </Link>
        <Link className="floating-quick-link" href="/financial-agenda">
          Agenda financeira
        </Link>
        <Link className="floating-quick-link" href="/accounts?mode=choose">
          Adicionar carteira
        </Link>
        <Link className="floating-quick-link" href="/imports">
          Importar dados
        </Link>
        <Link className="floating-quick-link floating-quick-link-muted" href="/support">
          Pedir suporte
        </Link>
      </nav>
    </details>
  );
}
