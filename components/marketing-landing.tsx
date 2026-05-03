import {
  ArrowRight,
  Brain,
  CalendarClock,
  CheckCircle2,
  LineChart,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  WalletCards
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";

const painPoints = [
  "Voce descobre o problema quando o dinheiro ja apertou.",
  "Registra gastos, mas nao enxerga o que vem pela frente.",
  "As contas, dividas e metas ficam espalhadas em lugares diferentes."
];

const pillars = [
  {
    icon: WalletCards,
    title: "Seu dinheiro em um so mapa",
    description:
      "Carteiras, contas, compromissos, importacoes, categorias e historico organizados para decisao diaria."
  },
  {
    icon: CalendarClock,
    title: "Previsao antes do aperto",
    description:
      "O Deniaros transforma contas futuras, depositos e recorrencias em uma agenda viva de saldo projetado."
  },
  {
    icon: Brain,
    title: "Consultor IA com contexto",
    description:
      "Pergunte como voce falaria com alguem de confianca. A IA entende seu resumo financeiro e sugere proximas acoes."
  }
];

const outcomes = [
  "Saber se o caixa aguenta os proximos 7, 30 e 90 dias.",
  "Priorizar dividas, vencimentos e decisoes sem achismo.",
  "Separar rotina, familia, metas e riscos em uma visao unica.",
  "Trocar planilhas e apps bonitos por uma mesa de decisao real."
];

const journey = [
  {
    step: "01",
    title: "Olhe para o passado",
    description: "Importe ou registre movimentos para revelar padroes, vazamentos e categorias criticas."
  },
  {
    step: "02",
    title: "Projete o futuro",
    description: "Monte sua agenda de contas, depositos e compromissos para antecipar saldo e riscos."
  },
  {
    step: "03",
    title: "Decida com clareza",
    description: "Use relatorios, planejadores e IA para escolher o proximo passo com menos ansiedade."
  }
];

const features = [
  "Dashboard de decisao",
  "Agenda financeira com previsao",
  "Planejador de dividas",
  "Orcamento com leitura anual",
  "Relatorios por habito, categoria e favorecido",
  "Plano Familia e visao consolidada",
  "Backup, auditoria e privacidade",
  "Suporte operacional com IA"
];

export function MarketingLanding() {
  return (
    <main className="marketing-page">
      <nav className="marketing-nav" aria-label="Principal">
        <Link className="marketing-brand" href="/">
          <Image
            alt="Deniaros"
            className="marketing-brand-mark"
            height={44}
            priority
            src="/brand/logo-icone-isolado-limpo.png"
            width={44}
          />
          <span>
            <strong>Deniaros</strong>
            <small>Controle com previsao</small>
          </span>
        </Link>
        <div className="marketing-nav-actions">
          <Link className="marketing-nav-link" href="#como-funciona">
            Como funciona
          </Link>
          <Link className="marketing-nav-link" href="#diferenciais">
            Diferenciais
          </Link>
          <Link className="marketing-ghost" href="/login">
            Entrar
          </Link>
          <Link className="marketing-primary" href="/login?mode=signup">
            Comecar agora
          </Link>
        </div>
      </nav>

      <section className="marketing-hero">
        <div className="marketing-hero-copy">
          <p className="marketing-eyebrow">
            <Sparkles aria-hidden="true" size={16} />
            Gestao financeira que olha para frente
          </p>
          <h1>Seu dinheiro nao precisa ser uma surpresa no fim do mes.</h1>
          <p className="marketing-hero-lead">
            O Deniaros une controle financeiro, agenda de compromissos, previsao de saldo,
            planejadores e IA para ajudar voce a sair do modo apagar incendio e tomar decisoes
            antes do aperto chegar.
          </p>
          <div className="marketing-hero-actions">
            <Link className="marketing-primary marketing-primary-large" href="/login?mode=signup">
              Criar minha conta
              <ArrowRight aria-hidden="true" size={18} />
            </Link>
            <Link className="marketing-secondary" href="#diferenciais">
              Ver por que e diferente
            </Link>
          </div>
          <div className="marketing-trust-row" aria-label="Compromissos do Deniaros">
            <span>
              <ShieldCheck aria-hidden="true" size={16} />
              Privacidade e auditoria
            </span>
            <span>
              <LineChart aria-hidden="true" size={16} />
              Previsao de caixa
            </span>
            <span>
              <Brain aria-hidden="true" size={16} />
              IA contextual
            </span>
          </div>
        </div>

        <div className="marketing-decision-board" aria-label="Exemplo de mesa de decisao Deniaros">
          <div className="marketing-board-header">
            <span>Mesa de decisao</span>
            <strong>Proximos 30 dias</strong>
          </div>
          <div className="marketing-balance-card">
            <span>Saldo projetado</span>
            <strong>R$ 5.086,32</strong>
            <small>Seu caixa previsto esta sob controle.</small>
          </div>
          <div className="marketing-board-grid">
            <article>
              <span>A pagar</span>
              <strong>3</strong>
              <small>1 vencendo hoje</small>
            </article>
            <article>
              <span>Menor saldo</span>
              <strong>R$ 2.814</strong>
              <small>ponto sensivel</small>
            </article>
            <article>
              <span>Acao</span>
              <strong>Priorizar</strong>
              <small>energia e mercado</small>
            </article>
          </div>
          <div className="marketing-chart">
            <span />
            <span />
            <span />
            <span />
            <span />
            <span />
            <span />
          </div>
        </div>
      </section>

      <section className="marketing-problem" aria-labelledby="problema-title">
        <div>
          <p className="marketing-section-label">O problema real</p>
          <h2 id="problema-title">A maioria dos apps mostra o gasto depois que ele ja aconteceu.</h2>
        </div>
        <div className="marketing-pain-list">
          {painPoints.map((pain) => (
            <p key={pain}>
              <CheckCircle2 aria-hidden="true" size={18} />
              {pain}
            </p>
          ))}
        </div>
      </section>

      <section className="marketing-section" id="diferenciais">
        <div className="marketing-section-head">
          <p className="marketing-section-label">Por que o Deniaros converte controle em evolucao</p>
          <h2>Ele nao nasceu para enfeitar lancamentos. Nasceu para orientar decisao.</h2>
        </div>
        <div className="marketing-pillar-grid">
          {pillars.map((pillar) => {
            const Icon = pillar.icon;

            return (
              <article className="marketing-pillar" key={pillar.title}>
                <Icon aria-hidden="true" size={24} />
                <h3>{pillar.title}</h3>
                <p>{pillar.description}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="marketing-outcomes">
        <div className="marketing-outcome-card">
          <Target aria-hidden="true" size={26} />
          <h2>O que o usuario ganha na pratica</h2>
          <p>
            Menos ansiedade financeira, mais previsibilidade e uma rotina clara para enfrentar
            contas, dividas, metas e escolhas do dia a dia.
          </p>
        </div>
        <div className="marketing-outcome-list">
          {outcomes.map((outcome) => (
            <p key={outcome}>
              <CheckCircle2 aria-hidden="true" size={18} />
              {outcome}
            </p>
          ))}
        </div>
      </section>

      <section className="marketing-section" id="como-funciona">
        <div className="marketing-section-head marketing-section-head-narrow">
          <p className="marketing-section-label">Metodo Deniaros</p>
          <h2>Olhar o passado para projetar o futuro.</h2>
        </div>
        <div className="marketing-journey">
          {journey.map((item) => (
            <article key={item.step}>
              <span>{item.step}</span>
              <h3>{item.title}</h3>
              <p>{item.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="marketing-feature-band">
        <div>
          <p className="marketing-section-label">Sistema completo</p>
          <h2>Uma estrutura para a vida financeira inteira, nao so para anotar gastos.</h2>
        </div>
        <div className="marketing-feature-grid">
          {features.map((feature) => (
            <span key={feature}>
              <CheckCircle2 aria-hidden="true" size={16} />
              {feature}
            </span>
          ))}
        </div>
      </section>

      <section className="marketing-final-cta">
        <TrendingUp aria-hidden="true" size={32} />
        <p className="marketing-section-label">Controle com previsao</p>
        <h2>Comece hoje a tomar decisoes com o dinheiro que voce tem e com o futuro que esta chegando.</h2>
        <p>
          O primeiro passo e simples: criar sua conta, registrar sua base e deixar o Deniaros
          transformar informacao em direcao.
        </p>
        <Link className="marketing-primary marketing-primary-large" href="/login?mode=signup">
          Criar minha conta no Deniaros
          <ArrowRight aria-hidden="true" size={18} />
        </Link>
      </section>
    </main>
  );
}
