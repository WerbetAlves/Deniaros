import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { getWorkspaceContext } from "@/lib/workspace-context";

type SettingsSearchParams = {
  q?: string;
  area?: string;
};

type SettingsArea = "all" | "account" | "system" | "finance" | "security";

type SettingsItem = {
  id: string;
  area: Exclude<SettingsArea, "all">;
  title: string;
  description: string;
  href?: string;
  status: string;
  action: string;
};

type SettingsRoadmapItem = {
  area: Exclude<SettingsArea, "all">;
  title: string;
  description: string;
  status: string;
};

const settingsAreas: Array<{ id: SettingsArea; label: string; description: string }> = [
  { id: "all", label: "Tudo", description: "Visão geral das configurações" },
  { id: "account", label: "Conta", description: "Perfil, assinatura e identidade" },
  { id: "system", label: "Sistema", description: "Tema, aparência e preferências" },
  { id: "finance", label: "Financeiro", description: "Categorias, impostos e dados do arquivo" },
  { id: "security", label: "Segurança", description: "Privacidade, backup e acesso" }
];

const settingsItems: SettingsItem[] = [
  {
    id: "profile",
    area: "account",
    title: "Perfil e aparência",
    description: "Nome, avatar, tema, fonte e densidade visual do Deniaros.",
    href: "/profile",
    status: "Disponível",
    action: "Abrir perfil"
  },
  {
    id: "personal-profile",
    area: "account",
    title: "Perfil financeiro pessoal",
    description: "Questionário, horizonte financeiro e dados usados nos planejadores.",
    href: "/personal-profile",
    status: "Recomendado",
    action: "Revisar perfil"
  },
  {
    id: "billing",
    area: "account",
    title: "Planos e assinatura",
    description: "Gestão de plano, cobrança e histórico de pagamentos via Stripe.",
    href: "/billing",
    status: "Disponível",
    action: "Abrir assinatura"
  },
  {
    id: "family",
    area: "account",
    title: "Plano Família",
    description: "Convite, membro adicional, permissões e visão consolidada do workspace familiar.",
    href: "/settings/family",
    status: "Disponível",
    action: "Gerenciar família"
  },
  {
    id: "categories",
    area: "finance",
    title: "Categorias",
    description: "Listas, subcategorias e grupos herdados do Money99 para classificar o arquivo.",
    href: "/categories",
    status: "Disponível",
    action: "Abrir categorias"
  },
  {
    id: "tax-categories",
    area: "finance",
    title: "Categorias de imposto",
    description: "Regras fiscais para relatórios e conferências do arquivo financeiro.",
    href: "/tax-categories",
    status: "Disponível",
    action: "Configurar"
  },
  {
    id: "imports",
    area: "finance",
    title: "Importação e regras",
    description: "Fontes, regras de classificação e limpeza de lançamentos importados.",
    href: "/imports",
    status: "Disponível",
    action: "Abrir importação"
  },
  {
    id: "preferences",
    area: "system",
    title: "Preferências do sistema",
    description: "Idioma, moeda base, atalhos, notificações e comportamento padrão.",
    href: "/settings/preferences",
    status: "Disponivel",
    action: "Abrir preferencias"
  },
  {
    id: "workspace",
    area: "system",
    title: "Workspace",
    description: "Nome do arquivo financeiro, país, fuso horário e perfil de uso.",
    href: "/settings/workspace",
    status: "Disponivel",
    action: "Abrir workspace"
  },
  {
    id: "privacy",
    area: "security",
    title: "Privacidade e acesso",
    description: "LGPD, consentimento da IA, exportação, exclusão e logs de acesso.",
    href: "/settings/privacy",
    status: "Disponível",
    action: "Abrir privacidade"
  },
  {
    id: "backup",
    area: "security",
    title: "Backup e restauração",
    description: "Exportação, restauração e apagamento de dados com confirmação e auditoria.",
    href: "/settings/backup",
    status: "Disponível",
    action: "Abrir backup"
  }
];

const settingsRoadmapItems: SettingsRoadmapItem[] = [
  {
    area: "finance",
    title: "Open Finance automático",
    description: "Conexão bancária direta entrará em área própria quando o provedor real estiver homologado.",
    status: "Roadmap"
  },
  {
    area: "system",
    title: "Paleta global de comandos",
    description: "Atalho universal para executar ações do sistema sem navegar por menus.",
    status: "Em implantação"
  },
  {
    area: "security",
    title: "Alertas por e-mail",
    description: "Canal externo para vencimentos, resumo semanal e eventos sensíveis.",
    status: "Depende de envio"
  }
];

export default async function SettingsPage({
  searchParams
}: {
  searchParams: Promise<SettingsSearchParams>;
}) {
  const { user } = await getWorkspaceContext();
  const params = await searchParams;
  const selectedArea = normalizeSettingsArea(params.area);
  const query = String(params.q ?? "").trim().toLowerCase();
  const filteredItems = settingsItems.filter((item) => {
    const matchesArea = selectedArea === "all" || item.area === selectedArea;
    const matchesQuery =
      !query || `${item.title} ${item.description} ${item.status}`.toLowerCase().includes(query);

    return matchesArea && matchesQuery;
  });
  const availableCount = settingsItems.filter((item) => item.href).length;
  const roadmapItems =
    selectedArea === "all"
      ? settingsRoadmapItems
      : settingsRoadmapItems.filter((item) => item.area === selectedArea);

  return (
    <AppShell userEmail={user.email}>
      <section className="module-page settings-workspace">
        <div className="module-hero panel settings-hero">
          <div>
            <p className="section-label">Central do sistema</p>
            <h2>Configurações</h2>
            <p className="supporting-copy">
              Central de ajustes do Deniaros: identidade, arquivo financeiro, preferências,
              privacidade e manutenção do sistema em um só lugar.
            </p>
          </div>
          <div className="profile-badges">
            <span className="status-chip">{availableCount} áreas disponíveis</span>
          </div>
        </div>

        <section className="panel settings-command-panel">
          <div>
            <p className="section-label">Centro de controle</p>
            <h3>O que você quer ajustar agora?</h3>
            <p>
              Comece pelo perfil se quer mudar a experiência visual. Use Categorias para
              organizar o arquivo financeiro e Segurança para operações sensíveis.
            </p>
          </div>
          <div className="settings-command-actions">
            <Link className="primary-button" href="/profile">
              Abrir perfil
            </Link>
            <Link className="ghost-button" href="/categories">
              Categorias
            </Link>
            <Link className="ghost-button" href="/support">
              Pedir ajuda
            </Link>
          </div>
        </section>

        <section className="settings-tools">
          <form className="settings-search-form" method="get">
            <label>
              Buscar configurações
              <input
                defaultValue={params.q ?? ""}
                name="q"
                placeholder="Buscar por perfil, categoria, backup..."
              />
            </label>
            <label>
              Área
              <select defaultValue={selectedArea} name="area">
                {settingsAreas.map((area) => (
                  <option key={area.id} value={area.id}>
                    {area.label}
                  </option>
                ))}
              </select>
            </label>
            <button className="ghost-button" type="submit">
              Filtrar
            </button>
          </form>
        </section>

        <nav className="settings-area-tabs" aria-label="Áreas de configuração">
          {settingsAreas.map((area) => (
            <Link
              className={area.id === selectedArea ? "active" : ""}
              href={area.id === "all" ? "/settings" : `/settings?area=${area.id}`}
              key={area.id}
            >
              <strong>{area.label}</strong>
              <span>{area.description}</span>
            </Link>
          ))}
        </nav>

        <section className="settings-grid" aria-label="Configurações disponíveis">
          {filteredItems.length ? (
            filteredItems.map((item) => (
              <article className="panel settings-card" key={item.id}>
                <div className="settings-card-head">
                  <span className={`settings-area-dot ${item.area}`} />
                  <span className="status-chip">{item.status}</span>
                </div>
                <div>
                  <p className="section-label">{getAreaLabel(item.area)}</p>
                  <h3>{item.title}</h3>
                  <p>{item.description}</p>
                </div>
                <div className="settings-card-footer">
                  <Link className="primary-button" href={item.href ?? "/settings"}>
                    {item.action}
                  </Link>
                </div>
              </article>
            ))
          ) : (
            <article className="panel empty-state">
              <strong>Nenhuma configuração encontrada.</strong>
              <p>Limpe a busca ou escolha outra área para navegar pelos ajustes disponíveis.</p>
            </article>
          )}
        </section>

        {roadmapItems.length ? (
          <details className="panel settings-roadmap-panel">
            <summary>
              <span>
                <p className="section-label">Em construção</p>
                <strong>Funcionalidades planejadas ficam recolhidas</strong>
              </span>
              <small>{roadmapItems.length} item(ns)</small>
            </summary>
            <div className="settings-roadmap-list">
              {roadmapItems.map((item) => (
                <article key={`${item.area}-${item.title}`}>
                  <span className="status-chip subtle">{item.status}</span>
                  <div>
                    <strong>{item.title}</strong>
                    <p>{item.description}</p>
                  </div>
                </article>
              ))}
            </div>
          </details>
        ) : null}

        <section className="panel settings-danger-panel">
          <div>
            <p className="section-label">Zona de perigo</p>
            <h3>Ações irreversíveis</h3>
            <p>
              Operações destrutivas ficam separadas e exigirão confirmação dupla antes de qualquer
              alteração real nos dados do sistema. Use o card Backup e restauração para exportar
              o arquivo ou iniciar uma solicitação de apagamento.
            </p>
          </div>
        </section>
      </section>
    </AppShell>
  );
}

function normalizeSettingsArea(value?: string): SettingsArea {
  return settingsAreas.some((area) => area.id === value) ? (value as SettingsArea) : "all";
}

function getAreaLabel(area: Exclude<SettingsArea, "all">) {
  return settingsAreas.find((option) => option.id === area)?.label ?? "Configuração";
}
