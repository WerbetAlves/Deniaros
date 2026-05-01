"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { usePathname } from "next/navigation";

type HelpContext = {
  id: string;
  title: string;
  description: string;
  primaryHint: string;
  topics: string[];
};

type HelpTopic = {
  id: string;
  title: string;
  description: string;
  steps: string[];
  href: string;
  keywords: string[];
};

const helpContexts: HelpContext[] = [
  {
    id: "home",
    title: "Início",
    description: "Resumo do caixa, previsão curta, alertas e próximas decisões.",
    primaryHint: "Comece pelos alertas e pela próxima melhor ação antes de registrar novos dados.",
    topics: ["dashboard", "financial-home", "home-personalization", "financial-routine", "advisor-alerts", "cashflow"]
  },
  {
    id: "accounts",
    title: "Carteiras",
    description: "Contas, carteiras manuais, saldos e base para Open Finance.",
    primaryHint: "Use esta área para criar a base confiável do seu arquivo financeiro.",
    topics: ["accounts", "account-structure", "account-groups", "account-history", "account-reconciliation", "account-naming", "first-wallet", "cashflow"]
  },
  {
    id: "financial-agenda",
    title: "Contas a pagar & receber",
    description: "Compromissos, depósitos, calendário e previsão de saldo.",
    primaryHint: "Cadastre eventos recorrentes para o Deniaros antecipar o caixa futuro.",
    topics: ["agenda", "cashflow", "advisor-alerts"]
  },
  {
    id: "planner",
    title: "Planejador",
    description: "Orçamento, redução de débitos e decisões de longo prazo.",
    primaryHint: "Escolha o plano pelo objetivo: reduzir dívida, controlar orçamento ou projetar futuro.",
    topics: ["planner", "budget", "debt"]
  },
  {
    id: "reports",
    title: "Relatórios",
    description: "Gráficos e leituras para entender hábitos, patrimônio e dívidas.",
    primaryHint: "Abra o relatório pela pergunta que você quer responder, não pelo tipo de gráfico.",
    topics: ["reports", "where-money-goes", "net-worth", "tax-prep", "cashflow"]
  },
  {
    id: "support",
    title: "Chat e suporte",
    description: "Conversa com IA, abertura de ticket e acompanhamento técnico.",
    primaryHint: "Converse naturalmente primeiro; se virar problema técnico, o ticket nasce com contexto.",
    topics: ["support", "assistant", "tickets"]
  },
  {
    id: "settings",
    title: "Configurações",
    description: "Preferências, categorias, segurança, backup e manutenção.",
    primaryHint: "Ajustes sensíveis devem ficar em áreas com confirmação clara.",
    topics: ["settings", "system-options", "categories", "backup"]
  },
  {
    id: "personal-profile",
    title: "Perfil pessoal",
    description: "Entrevista financeira e plano de ação personalizado.",
    primaryHint: "Quanto mais completo o perfil, melhor o sistema recomenda o próximo movimento.",
    topics: ["personal-profile", "advisor-alerts", "planner"]
  },
  {
    id: "imports",
    title: "Importação",
    description: "Entrada de extratos CSV, QIF legado, regras, deduplicação e conciliação.",
    primaryHint: "Importe em revisão primeiro; depois confira duplicados, categorias e saldo final.",
    topics: ["legacy-migration", "imports", "cashflow"]
  },
  {
    id: "assistant",
    title: "Assistente financeiro",
    description: "Conversa natural sobre seus dados financeiros e próximos passos.",
    primaryHint: "Use perguntas abertas, como o que mudou no mês ou o que merece atenção agora.",
    topics: ["assistant", "reports", "cashflow"]
  }
];

const fallbackContext: HelpContext = {
  id: "general",
  title: "Deniaros",
  description: "Ajuda contextual para usar o sistema com mais fluidez.",
  primaryHint: "Busque por uma palavra-chave ou converse com a IA para receber orientação.",
  topics: ["dashboard", "assistant", "support"]
};

const helpTopics: HelpTopic[] = [
  {
    id: "dashboard",
    title: "Como ler o centro de comando",
    description: "Entenda saldo atual, previsão, alertas e próxima melhor ação.",
    steps: [
      "Veja primeiro o saldo consolidado e a próxima melhor ação.",
      "Confira o menor saldo previsto para evitar aperto antes do vencimento.",
      "Use os atalhos para registrar movimento ou abrir a agenda."
    ],
    href: "/",
    keywords: ["inicio", "home", "dashboard", "centro", "saldo", "comando"]
  },
  {
    id: "financial-home",
    title: "Home page financeira",
    description: "A Home concentra o que mudou, o que vence e o que merece decisao.",
    steps: [
      "Comece pelos lembretes para agir no que esta pendente.",
      "Use o grafico do dia como provocacao rapida para analisar saldo, contas ou previsao.",
      "Leia a dica do dia e avance para relatorios, agenda ou IA quando precisar de profundidade."
    ],
    href: "/",
    keywords: ["home", "conteudo", "lembrete", "grafico do dia", "dica do dia"]
  },
  {
    id: "home-personalization",
    title: "Personalizar a Home",
    description: "Escolha quais blocos aparecem e ajuste a ordem conforme seu jeito de decidir.",
    steps: [
      "Ative ou desative blocos no painel Home page financeira.",
      "Use Subir e Descer para priorizar o que voce consulta primeiro.",
      "As escolhas ficam salvas neste navegador e podem virar preferencia de conta depois."
    ],
    href: "/",
    keywords: ["personalizar", "ordem", "modulo", "home", "preferencia"]
  },
  {
    id: "financial-routine",
    title: "Rotina financeira no Deniaros",
    description: "Um ciclo simples para manter o arquivo vivo sem virar trabalho pesado.",
    steps: [
      "Diariamente, registre movimentos importantes enquanto ainda lembra dos detalhes.",
      "Semanalmente, importe extratos, revise pendências e cadastre contas recebidas.",
      "Mensalmente, leia relatórios, orçamento e saldo final para ajustar o próximo mês.",
      "Anualmente, limpe categorias, favorecidos, contas inativas e dados fiscais."
    ],
    href: "/",
    keywords: ["rotina", "diario", "semanal", "mensal", "anual", "primeiros passos"]
  },
  {
    id: "file-vs-account",
    title: "Arquivo financeiro, workspace e contas",
    description: "Entenda a diferença entre o conjunto de dados e as contas dentro dele.",
    steps: [
      "O workspace é o seu arquivo financeiro: ele guarda contas, categorias, movimentos e relatórios.",
      "Cada carteira ou conta bancária é apenas uma parte desse arquivo.",
      "Use workspaces separados somente quando os contextos não devem se misturar, como pessoal e empresa."
    ],
    href: "/settings?area=system",
    keywords: ["arquivo", "workspace", "conta", "empresa", "pessoal"]
  },
  {
    id: "advisor-alerts",
    title: "Alertas do consultor financeiro",
    description: "Avisos sobre perfil, contas, vencimentos, margem mensal e conexão.",
    steps: [
      "Abra o sino no topo para ver avisos ativos.",
      "Priorize alertas de atraso, vencimentos próximos e despesas acima das receitas.",
      "Use o link Abrir para ir direto ao ponto que precisa de atenção."
    ],
    href: "/",
    keywords: ["alerta", "notificacao", "consultor", "aviso", "vencimento"]
  },
  {
    id: "cashflow",
    title: "Previsão de caixa",
    description: "Como o Deniaros usa histórico e agenda para projetar o futuro.",
    steps: [
      "Mantenha carteiras e movimentos reais atualizados.",
      "Cadastre contas, depósitos e compromissos recorrentes na agenda.",
      "Revise a projeção quando uma conta for paga, adiada ou alterada."
    ],
    href: "/financial-agenda",
    keywords: ["previsao", "caixa", "saldo", "futuro", "agenda", "projecao"]
  },
  {
    id: "accounts",
    title: "Carteiras e contas",
    description: "Cadastre carteira física, conta manual ou prepare conexão Open Finance.",
    steps: [
      "Crie uma carteira física para dinheiro em mãos.",
      "Use conta manual quando ainda não houver conexão bancária.",
      "Reserve Open Finance para contas que serão sincronizadas direto do banco."
    ],
    href: "/accounts",
    keywords: ["carteira", "conta", "banco", "open finance", "saldo"]
  },
  {
    id: "account-structure",
    title: "Tipos de conta",
    description: "Use o tipo correto para separar dinheiro do dia a dia, patrimônio, dívidas e investimentos.",
    steps: [
      "Use Conta corrente, Carteira ou Reserva para dinheiro operacional.",
      "Use Cartão, Empréstimo ou Passivo quando a conta representa dívida.",
      "Use Ativo, Investimento ou Aposentadoria para patrimônio e objetivos de longo prazo."
    ],
    href: "/accounts",
    keywords: ["tipo", "conta", "ativo", "passivo", "emprestimo", "investimento", "aposentadoria"]
  },
  {
    id: "account-groups",
    title: "Grupos financeiros",
    description: "A visão por grupos mostra o papel de cada conta no seu arquivo financeiro.",
    steps: [
      "Despesas diárias concentram as contas usadas para pagar e receber no mês.",
      "Poupança e longo prazo separam reservas, ativos, investimentos e aposentadoria.",
      "Dívidas e fora do orçamento evitam misturar obrigações com caixa disponível."
    ],
    href: "/accounts",
    keywords: ["grupo", "orcamento", "despesas diarias", "poupanca", "divida"]
  },
  {
    id: "account-history",
    title: "Movimentação e histórico",
    description: "Cada conta deve contar a história do saldo: o que entrou, saiu e mudou ao longo do tempo.",
    steps: [
      "Abra uma conta para ver os movimentos que formam o saldo.",
      "Use filtros de período e categoria para investigar variações.",
      "Mantenha lançamentos consistentes para que relatórios e previsões aprendam com o passado."
    ],
    href: "/transactions",
    keywords: ["historico", "movimentacao", "transacao", "saldo", "extrato"]
  },
  {
    id: "account-reconciliation",
    title: "Conferir saldo",
    description: "A conferência evita que importações, duplicados ou lançamentos manuais distorçam o futuro.",
    steps: [
      "Compare o saldo da conta com o extrato real ou com a conexão Open Finance.",
      "Revise duplicados depois de importações e marque o que já foi conferido.",
      "Ajuste diferenças antes de confiar em orçamento, relatórios ou previsão de caixa."
    ],
    href: "/accounts",
    keywords: ["conferir", "conciliar", "saldo", "extrato", "duplicado", "importacao"]
  },
  {
    id: "account-naming",
    title: "Nomear contas com clareza",
    description: "Bons nomes deixam buscas, relatórios e preenchimentos mais rápidos.",
    steps: [
      "Comece pelo uso quando há várias contas no mesmo banco, como Corrente Banco 2 ou Poupança Banco 2.",
      "Comece pelo banco quando há contas semelhantes em instituições diferentes.",
      "Evite nomes duplicados ou genéricos, pois eles confundem relatórios e importações."
    ],
    href: "/accounts",
    keywords: ["nome", "conta", "carteira", "preenchimento", "banco"]
  },
  {
    id: "first-wallet",
    title: "Primeira carteira",
    description: "O primeiro cadastro necessário para o sistema calcular seu fluxo.",
    steps: [
      "Abra Carteiras.",
      "Escolha o tipo de carteira conforme a origem do dinheiro.",
      "Informe saldo inicial e comece a registrar movimentos."
    ],
    href: "/accounts",
    keywords: ["primeira", "carteira", "comecar", "saldo inicial"]
  },
  {
    id: "agenda",
    title: "Agenda financeira viva",
    description: "Contas, depósitos, reservas e compromissos que afetam seu futuro.",
    steps: [
      "Cadastre contas a pagar, contas a receber e depósitos.",
      "Use recorrência para eventos mensais ou repetitivos.",
      "Dê baixa quando pagar para transformar previsão em histórico confiável."
    ],
    href: "/financial-agenda",
    keywords: ["agenda", "contas", "receber", "pagar", "deposito", "calendario"]
  },
  {
    id: "planner",
    title: "Escolher um planejador",
    description: "Quando usar orçamento, redução de débitos ou visão de longo prazo.",
    steps: [
      "Use orçamento para controlar o mês.",
      "Use redução de débitos para priorizar dívidas e juros.",
      "Use as previsões para testar se o plano cabe no caixa."
    ],
    href: "/planner",
    keywords: ["planejador", "orcamento", "debito", "divida", "plano"]
  },
  {
    id: "budget",
    title: "Planejador de orçamento",
    description: "Transforme renda, gastos e metas em limites úteis.",
    steps: [
      "Revise rendimentos e despesas recorrentes.",
      "Separe despesas ocasionais para evitar surpresa.",
      "Compare resumo mensal e anual antes de assumir novas metas."
    ],
    href: "/planner?view=budget",
    keywords: ["orcamento", "gastos", "renda", "limite", "mensal"]
  },
  {
    id: "debt",
    title: "Redução de débitos",
    description: "Monte uma estratégia para quitar dívidas com menos juros.",
    steps: [
      "Inclua contas de débito no plano.",
      "Defina pagamento mensal possível e pagamentos extras.",
      "Revise a previsão antes de executar o plano."
    ],
    href: "/planner?view=debts",
    keywords: ["debito", "divida", "juros", "cartao", "emprestimo"]
  },
  {
    id: "reports",
    title: "Relatórios e gráficos",
    description: "Escolha relatórios pela pergunta financeira que você quer responder.",
    steps: [
      "Use hábitos de consumo para entender gastos.",
      "Use patrimônio para comparar o que você tem com o que deve.",
      "Use dívidas e impostos para análise específica."
    ],
    href: "/reports",
    keywords: ["relatorio", "grafico", "analise", "despesa", "patrimonio"]
  },
  {
    id: "where-money-goes",
    title: "Para onde meu dinheiro vai",
    description: "Descubra quais categorias e favorecidos puxam seu consumo.",
    steps: [
      "Abra Relatórios em Hábitos de consumo.",
      "Selecione o período desejado.",
      "Compare categorias e abra detalhes quando algo fugir do padrão."
    ],
    href: "/reports?section=habits&report=where-money-goes",
    keywords: ["dinheiro", "gasto", "categoria", "habito", "consumo"]
  },
  {
    id: "assistant",
    title: "Conversa natural com a IA",
    description: "Pergunte sobre seus dados sem depender de formulários rígidos.",
    steps: [
      "Abra o Assistente financeiro.",
      "Pergunte em linguagem natural sobre caixa, gastos, dívidas ou planejamento.",
      "Peça próximos passos quando quiser uma recomendação objetiva."
    ],
    href: "/assistant",
    keywords: ["ia", "assistente", "chat", "conversa", "natural"]
  },
  {
    id: "support",
    title: "Quando abrir suporte",
    description: "Use suporte quando a dúvida vira problema técnico, cobrança ou acesso.",
    steps: [
      "Converse com a IA para explicar o cenário.",
      "Se não resolver, abra ticket com histórico e prioridade.",
      "Acompanhe o ticket até a conclusão."
    ],
    href: "/support",
    keywords: ["suporte", "ticket", "erro", "ajuda", "atendimento"]
  },
  {
    id: "tickets",
    title: "Acompanhar tickets",
    description: "Veja status, prioridade, SLA e histórico do atendimento.",
    steps: [
      "Filtre tickets por status ou busca.",
      "Abra o histórico para ver respostas e contexto.",
      "Atualize o ticket quando tiver novas informações."
    ],
    href: "/support",
    keywords: ["ticket", "historico", "sla", "prioridade", "status"]
  },
  {
    id: "settings",
    title: "Configurações do sistema",
    description: "Organize preferências, workspace, privacidade e manutenção.",
    steps: [
      "Use a busca para encontrar a área de ajuste.",
      "Abra artigos de configuração sem repetir ações perigosas.",
      "Revise permissões e backup antes de mudanças sensíveis."
    ],
    href: "/settings",
    keywords: ["configuracao", "preferencia", "workspace", "privacidade"]
  },
  {
    id: "system-options",
    title: "Opções e preferências do sistema",
    description: "O equivalente moderno das opções do Money fica distribuído por perfil, configurações e segurança.",
    steps: [
      "Use Perfil para aparência, densidade e identidade visual.",
      "Use Configurações para workspace, categorias, importações e segurança.",
      "Use Ajuda contextual quando estiver em dúvida sobre onde um ajuste pertence."
    ],
    href: "/settings",
    keywords: ["opcoes", "preferencias", "tema", "backup", "senha", "moeda"]
  },
  {
    id: "categories",
    title: "Categorias",
    description: "Organize categorias, subcategorias e grupos para relatórios melhores.",
    steps: [
      "Abra Categorias dentro de Configurações.",
      "Crie, edite ou mova categorias conforme seu uso real.",
      "Evite categorias duplicadas para manter relatórios limpos."
    ],
    href: "/categories",
    keywords: ["categoria", "subcategoria", "grupo", "classificacao"]
  },
  {
    id: "backup",
    title: "Backup e restauração",
    description: "Área para exportação, restauração e ações sensíveis do sistema.",
    steps: [
      "Use backup antes de mudanças de grande impacto.",
      "Revise confirmações para ações irreversíveis.",
      "Mantenha operações destrutivas dentro da área de segurança."
    ],
    href: "/settings",
    keywords: ["backup", "restauracao", "apagar", "dados", "seguranca"]
  },
  {
    id: "personal-profile",
    title: "Perfil pessoal",
    description: "Entrevista que adapta recomendações, alertas e plano de ação.",
    steps: [
      "Responda as perguntas no seu ritmo.",
      "Revise o plano de ação gerado automaticamente.",
      "Atualize respostas quando sua vida financeira mudar."
    ],
    href: "/personal-profile",
    keywords: ["perfil", "entrevista", "plano de acao", "personalizacao"]
  },
  {
    id: "tax-prep",
    title: "Preparar impostos durante o ano",
    description: "Categorias consistentes reduzem correria quando chega o fechamento fiscal.",
    steps: [
      "Classifique despesas e receitas com categorias fiscais quando fizer sentido.",
      "Guarde recibos digitais para itens dedutíveis ou reembolsáveis.",
      "Revise relatórios de impostos antes do fechamento anual."
    ],
    href: "/tax-categories",
    keywords: ["imposto", "receita", "dedutivel", "categoria fiscal", "recibo"]
  },
  {
    id: "net-worth",
    title: "Calcular patrimônio",
    description: "Patrimônio nasce da soma do que você tem menos o que você deve.",
    steps: [
      "Cadastre contas, investimentos e bens relevantes.",
      "Registre cartões, empréstimos e outros passivos.",
      "Use relatórios de patrimônio para acompanhar a evolução ao longo do tempo."
    ],
    href: "/reports?section=assets&report=net-worth",
    keywords: ["patrimonio", "ativo", "passivo", "investimento", "divida"]
  },
  {
    id: "reimbursable-expenses",
    title: "Despesas reembolsáveis",
    description: "Separe gastos que serão devolvidos para não confundir consumo pessoal.",
    steps: [
      "Crie uma categoria ou carteira de controle para reembolsos.",
      "Registre a saída quando pagar a despesa.",
      "Registre a entrada quando receber o reembolso e confira se o saldo ficou neutro."
    ],
    href: "/transactions/new",
    keywords: ["reembolso", "despesa", "empresa", "relatorio", "trabalho"]
  },
  {
    id: "family-finance",
    title: "Educação financeira familiar",
    description: "Use o Deniaros para explicar orçamento, poupança e escolhas financeiras em família.",
    steps: [
      "Mostre objetivos simples, como reserva, mesada ou compra planejada.",
      "Use orçamento e relatórios para conversar sobre escolhas do mês.",
      "No plano família, mantenha perfis e permissões bem definidos."
    ],
    href: "/billing",
    keywords: ["familia", "filhos", "mesada", "educacao financeira", "plano familia"]
  },
  {
    id: "legacy-migration",
    title: "Migrar de Money, Quicken ou planilha antiga",
    description: "Traga dados antigos sem tocar no arquivo original e com revisão antes de lançar.",
    steps: [
      "Exporte uma cópia CSV ou QIF do sistema anterior.",
      "Importe para uma conta individual e mantenha os movimentos pendentes.",
      "Confira duplicados, categorias, favorecidos e saldo final antes de considerar concluído."
    ],
    href: "/imports",
    keywords: ["quicken", "money", "qif", "csv", "migracao", "importacao", "legado"]
  },
  {
    id: "imports",
    title: "Importação e conciliação",
    description: "Use prévia, regras e auditoria para transformar extrato em histórico confiável.",
    steps: [
      "Escolha a conta de destino antes de colar ou anexar o arquivo.",
      "Revise a pré-conciliação para identificar duplicados prováveis.",
      "Marque como lançado apenas depois da conferência."
    ],
    href: "/imports",
    keywords: ["importar", "extrato", "conciliacao", "duplicado", "regra"]
  }
];

export function HelpCenter() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [query, setQuery] = useState("");
  const context = resolveHelpContext(pathname);
  const normalizedQuery = normalizeSearch(query);

  const topics = useMemo(() => {
    const contextualTopics = context.topics
      .map((topicId) => helpTopics.find((topic) => topic.id === topicId))
      .filter(Boolean) as HelpTopic[];
    const remainingTopics = helpTopics.filter(
      (topic) => !contextualTopics.some((current) => current.id === topic.id)
    );

    if (!normalizedQuery) {
      return [...contextualTopics, ...remainingTopics].slice(0, 7);
    }

    return helpTopics
      .map((topic) => ({
        topic,
        score: getSearchScore(topic, normalizedQuery)
      }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((item) => item.topic)
      .slice(0, 8);
  }, [context, normalizedQuery]);

  const assistantQuestion = encodeURIComponent(
    query.trim()
      ? `Estou na área ${context.title}. Me ajude com: ${query.trim()}`
      : `Estou na área ${context.title}. Me explique o que devo fazer agora.`
  );

  return (
    <div className={`help-center${open ? " open" : ""}${pinned ? " pinned" : ""}`}>
      <button
        aria-expanded={open}
        aria-label="Abrir ajuda contextual"
        className="topbar-icon-button help-center-trigger"
        onClick={() => setOpen((current) => !current)}
        title="Ajuda"
        type="button"
      >
        <HelpIcon />
      </button>

      {open ? (
        <aside
          aria-label="Ajuda contextual do Deniaros"
          className="help-center-panel"
          onMouseLeave={() => {
            if (!pinned) {
              setOpen(false);
            }
          }}
        >
          <header className="help-center-header">
            <div>
              <p className="section-label">Ajuda do Deniaros</p>
              <h3>{context.title}</h3>
              <p>{context.description}</p>
            </div>
            <button
              aria-pressed={pinned}
              className="help-pin-button"
              onClick={() => setPinned((current) => !current)}
              type="button"
            >
              {pinned ? "Fixado" : "Fixar"}
            </button>
          </header>

          <div className="help-current-card">
            <strong>Melhor começo agora</strong>
            <p>{context.primaryHint}</p>
          </div>

          <label className="help-search-field">
            Buscar ajuda
            <input
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Ex.: orçamento, cartão, relatório..."
              type="search"
              value={query}
            />
          </label>

          <div className="help-topic-list">
            {topics.length ? (
              topics.map((topic) => (
                <article className="help-topic-card" key={topic.id}>
                  <div>
                    <h4>{topic.title}</h4>
                    <p>{topic.description}</p>
                  </div>
                  <ol>
                    {topic.steps.map((step) => (
                      <li key={step}>{step}</li>
                    ))}
                  </ol>
                  <Link className="ghost-button" href={topic.href}>
                    Abrir área
                  </Link>
                </article>
              ))
            ) : (
              <article className="help-topic-empty">
                <strong>Nada encontrado.</strong>
                <p>Tente outra palavra-chave ou converse com a IA.</p>
              </article>
            )}
          </div>

          <footer className="help-center-actions">
            <Link className="primary-button" href={`/assistant?question=${assistantQuestion}`}>
              Conversar com a IA
            </Link>
            <Link className="ghost-button" href={`/support?question=${assistantQuestion}`}>
              Abrir suporte
            </Link>
          </footer>
        </aside>
      ) : null}
    </div>
  );
}

function resolveHelpContext(pathname: string) {
  if (pathname === "/") {
    return helpContexts[0];
  }

  return (
    helpContexts.find((context) => pathname === `/${context.id}` || pathname.startsWith(`/${context.id}/`)) ??
    fallbackContext
  );
}

function getSearchScore(topic: HelpTopic, query: string) {
  const haystack = normalizeSearch(
    [topic.title, topic.description, topic.steps.join(" "), topic.keywords.join(" ")].join(" ")
  );

  if (haystack.includes(query)) {
    return 10 + query.length;
  }

  return query
    .split(" ")
    .filter(Boolean)
    .reduce((score, word) => score + (haystack.includes(word) ? 1 : 0), 0);
}

function normalizeSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function HelpIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M12 18h.01" />
      <path d="M9.4 9a2.8 2.8 0 1 1 4.7 2c-.9.8-1.7 1.4-1.9 3" />
      <circle cx="12" cy="12" r="9" />
    </svg>
  );
}
