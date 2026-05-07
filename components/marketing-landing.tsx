import {
  ArrowRight,
  Brain,
  CalendarClock,
  CheckCircle2,
  Import,
  LineChart,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  WalletCards
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";

const painPoints = [
  "Você gasta hoje sem saber o impacto de amanhã.",
  "As contas parecem controladas até aparecer uma surpresa.",
  "O saldo do banco engana porque não considera o que vem pela frente.",
  "O Deniaros transforma saldo parado em decisão."
];

const outcomes = [
  "Você sabe exatamente quanto pode gastar.",
  "Você vê o problema antes dele acontecer.",
  "Você toma decisões sem ansiedade.",
  "Você para de apagar incêndio.",
  "Você começa a ter controle real."
];

const journey = [
  {
    description: "Crie carteiras, registre manualmente ou importe extratos.",
    step: "01",
    title: "Monte sua base"
  },
  {
    description: "O Deniaros cruza saldo, agenda e movimentos do mês.",
    step: "02",
    title: "Veja a previsão"
  },
  {
    description: "Você entende o risco e sabe o que ajustar agora.",
    step: "03",
    title: "Decida com clareza"
  }
];

const features = [
  "Dashboard de decisão",
  "Agenda financeira com previsão",
  "Simulador Posso gastar?",
  "Modo emergência",
  "Relatórios essenciais",
  "Orientação inteligente inicial"
];

const quickResults = [
  "Quanto posso gastar hoje?",
  "O que vence nos próximos dias?",
  "Meu saldo vai ficar negativo?",
  "Qual decisão devo tomar agora?"
];

const operatingRhythm = [
  {
    icon: WalletCards,
    text: "Comece com carteiras, lançamentos e extratos. Banco conectado não é requisito.",
    title: "Base manual ou importada"
  },
  {
    icon: CalendarClock,
    text: "Aluguel, cartão, mercado, combustível e boletos entram na previsão.",
    title: "Agenda financeira"
  },
  {
    icon: LineChart,
    text: "O sistema mostra se o dinheiro aguenta até o fim do mês.",
    title: "Saldo projetado"
  },
  {
    icon: Brain,
    text: "A orientação sugere próximos passos simples com base nos seus dados.",
    title: "Próxima ação"
  }
];

const planItems = [
  "Contas e carteiras",
  "Lançamentos manuais",
  "Importação CSV",
  "Agenda financeira",
  "Previsão de saldo",
  "Simulador Posso gastar?",
  "Modo emergência",
  "Relatórios essenciais",
  "Orientação inteligente inicial"
];

const futurePlans = [
  {
    description: "Conexão bancária automática, automações e inteligência avançada.",
    title: "Deniaros Inteligente"
  },
  {
    description: "Controle financeiro compartilhado para casal e família.",
    title: "Deniaros Família"
  }
];

const proofPoints = [
  "Seus dados protegidos por autenticação, permissões e auditoria.",
  "Pagamentos preparados para o padrão Stripe.",
  "Você começa manualmente ou por importação. Open Finance será evolução futura.",
  "Backup, restauração e logs para operar dinheiro real com segurança."
];

const faqs = [
  {
    answer:
      "Não. Você pode começar manualmente ou por importação. Open Finance será uma evolução para automatizar mais, não uma exigência para começar.",
    question: "Preciso conectar banco para usar?"
  },
  {
    answer:
      "Sim. O Deniaros foi desenhado com autenticação, permissões, auditoria, backup e controles de privacidade para proteger seu workspace financeiro.",
    question: "Meus dados financeiros ficam seguros?"
  },
  {
    answer:
      "Não. A orientação inteligente do Deniaros usa sua base, agenda e previsão para sugerir próximos passos operacionais, sem prometer resultado financeiro e sem substituir um profissional.",
    question: "A IA substitui consultoria financeira?"
  },
  {
    answer:
      "Sim. Crie sua conta, monte sua primeira carteira e registre ou importe seus primeiros movimentos. A previsão aparece quando existe base real.",
    question: "Consigo testar antes de pagar?"
  }
];

function ConversionCta({ label = "Ver minha previsão grátis" }: { label?: string }) {
  return (
    <Link className="marketing-primary marketing-primary-large" href="/login?mode=signup">
      {label}
      <ArrowRight aria-hidden="true" size={18} />
    </Link>
  );
}

export function MarketingLanding() {
  return (
    <main className="marketing-page">
      <Link className="marketing-mobile-sticky-cta" href="/login?mode=signup">
        Ver minha previsão grátis
        <ArrowRight aria-hidden="true" size={16} />
      </Link>

      <nav className="marketing-nav" aria-label="Principal">
        <Link className="marketing-brand" href="/">
          <Image
            alt="Logo oficial Deniaros"
            className="marketing-brand-mark"
            height={44}
            priority
            src="/brand/logo-icone-isolado-limpo.png"
            width={44}
          />
          <span>
            <strong>Deniaros</strong>
            <small>Controle com previsão</small>
          </span>
        </Link>
        <div className="marketing-nav-actions">
          <Link className="marketing-nav-link" href="#como-funciona">
            Como funciona
          </Link>
          <Link className="marketing-ghost" href="/login">
            Entrar
          </Link>
        </div>
      </nav>

      <section className="marketing-hero">
        <div className="marketing-hero-copy marketing-reveal">
          <p className="marketing-eyebrow">
            <Sparkles aria-hidden="true" size={16} />
            Controle com previsão
          </p>
          <h1>Descubra hoje se seu dinheiro vai acabar antes do fim do mês.</h1>
          <p className="marketing-hero-lead">
            Monte sua base financeira, veja seu saldo projetado e saiba o que ajustar antes do
            problema chegar.
          </p>
          <div className="marketing-hero-actions">
            <div className="marketing-hero-cta-wrapper">
              <ConversionCta />
              <small className="marketing-cta-note">Não precisa de cartão. Não precisa conectar banco.</small>
            </div>
            <Link className="marketing-secondary" href="#como-funciona">
              Ver como funciona
            </Link>
          </div>
          <div className="marketing-trust-row" aria-label="Compromissos do Deniaros">
            <span>
              <Import aria-hidden="true" size={16} />
              Manual ou importação
            </span>
            <span>
              <LineChart aria-hidden="true" size={16} />
              Previsão do mês
            </span>
            <span>
              <Brain aria-hidden="true" size={16} />
              Próxima ação clara
            </span>
          </div>
        </div>

        <div className="marketing-hero-board">
          <div className="marketing-floating-card marketing-floating-card-left">
            <span>Conta vencendo</span>
            <strong>-R$ 118,40</strong>
            <small>Energia em 01 de mai.</small>
          </div>
          <div className="marketing-floating-card marketing-floating-card-right">
            <span>Decisão segura</span>
            <strong>Adiar compra</strong>
            <small>Evita caixa negativo.</small>
          </div>

          <div className="marketing-decision-board" aria-label="Exemplo de previsão Deniaros">
            <p className="marketing-board-kicker">Veja sua previsão antes do problema acontecer</p>
            <div className="marketing-board-header">
              <span>Mesa de decisão</span>
              <strong>Próximos 30 dias</strong>
            </div>
            <div className="marketing-balance-card">
              <span>Saldo projetado</span>
              <strong>R$ 5.086,32</strong>
              <small>Seu caixa previsto está sob controle, sem surpresas no fim do mês.</small>
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
                <small>ponto sensível</small>
              </article>
              <article>
                <span>Ação</span>
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
        </div>
      </section>

      <section className="marketing-quick-results" aria-labelledby="quick-results-title">
        <div>
          <p className="marketing-section-label">Resultado rápido</p>
          <h2 id="quick-results-title">Em poucos minutos, você sai do achismo.</h2>
        </div>
        <div className="marketing-quick-grid">
          {quickResults.map((result) => (
            <p key={result}>
              <CheckCircle2 aria-hidden="true" size={18} />
              {result}
            </p>
          ))}
        </div>
      </section>

      <section className="marketing-problem marketing-consequence" aria-labelledby="consequence-title">
        <div>
          <p className="marketing-section-label">Dor real</p>
          <h2 id="consequence-title">Seu banco mostra saldo. O Deniaros mostra consequência.</h2>
          <p className="marketing-consequence-text">
            O problema não é só saber quanto tem agora. É saber se esse dinheiro aguenta aluguel,
            cartão, mercado, combustível, boletos e imprevistos até o fim do mês.
          </p>
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

      <section className="marketing-inline-cta" aria-label="Começar depois da dor">
        <div>
          <p className="marketing-section-label">Primeiro passo</p>
          <h2>Monte sua base e veja se o mês fecha.</h2>
        </div>
        <ConversionCta label="Montar minha base financeira" />
      </section>

      <section className="marketing-live-flow" aria-labelledby="live-flow-title">
        <div className="marketing-section-head marketing-section-head-narrow">
          <p className="marketing-section-label">Sem depender de banco conectado</p>
          <h2 id="live-flow-title">Comece manualmente. Importe quando quiser. Evolua depois.</h2>
          <p>
            O foco inicial é simples: organizar o que entra, o que sai e o que vem pela frente.
            Conexão bancária será uma evolução futura para automatizar ainda mais.
          </p>
        </div>
        <div className="marketing-flow-rail">
          {operatingRhythm.map((item, index) => {
            const Icon = item.icon;

            return (
              <article key={item.title} style={{ "--flow-delay": `${index * 140}ms` } as CSSProperties}>
                <Icon aria-hidden="true" size={22} />
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="marketing-section" id="como-funciona">
        <div className="marketing-section-head marketing-section-head-narrow">
          <p className="marketing-section-label">Como funciona</p>
          <h2>Simples. Rápido. Direto.</h2>
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

      <section className="marketing-inline-cta" aria-label="Começar depois do funcionamento">
        <div>
          <p className="marketing-section-label">Sem enrolação</p>
          <h2>Crie a conta, registre a base e veja a previsão nascer.</h2>
        </div>
        <ConversionCta label="Começar agora" />
      </section>

      <section className="marketing-section" aria-labelledby="ai-advisor-title">
        <div className="marketing-section-head marketing-section-head-narrow">
          <p className="marketing-section-label">Orientação com contexto</p>
          <h2 id="ai-advisor-title">Orientação prática, sem conselho genérico.</h2>
          <p>
            A orientação inteligente do Deniaros não tenta adivinhar sua vida. Ela lê sua base
            financeira, sua agenda e sua previsão para sugerir próximos passos simples.
          </p>
        </div>

        <div className="marketing-decision-board marketing-ai-board" aria-label="Simulação da orientação Deniaros">
          <p className="marketing-board-kicker">
            <Sparkles aria-hidden="true" className="marketing-inline-icon" size={14} />
            Orientação baseada nos seus dados
          </p>
          <div className="marketing-board-header">
            <span>Você perguntou:</span>
            <strong>"Posso trocar de celular este mês?"</strong>
          </div>
          <div className="marketing-balance-card">
            <span>Leitura da previsão</span>
            <strong>Não recomendo agora.</strong>
            <small>Seu menor saldo previsto cai para R$ 840,00 no dia 15 por causa do cartão e do seguro.</small>
          </div>
          <div className="marketing-board-grid">
            <article>
              <span>Ação sugerida</span>
              <strong>Adiar 30 dias</strong>
              <small>A margem melhora</small>
            </article>
            <article>
              <span>Impacto</span>
              <strong>Risco evitado</strong>
              <small>Caixa apertado</small>
            </article>
            <article>
              <span>Base</span>
              <strong>Seus dados</strong>
              <small>Agenda e saldo</small>
            </article>
          </div>
        </div>
      </section>

      <section className="marketing-offer" aria-labelledby="offer-title">
        <div>
          <p className="marketing-section-label">Oferta inicial</p>
          <h2 id="offer-title">Comece simples. Evolua quando fizer sentido.</h2>
          <p>
            Um plano ativo agora: controle, previsão e decisão. Os recursos automáticos entram como
            evolução, não como barreira para começar.
          </p>
        </div>
        <article className="marketing-plan-card">
          <span>Deniaros Controle</span>
          <h3>Descubra antes se o mês vai apertar.</h3>
          <strong className="marketing-plan-price">R$ 29/mês</strong>
          <p>
            Para quem quer organizar contas, registrar movimentos, importar extratos e enxergar a
            previsão do mês.
          </p>
          <div className="marketing-plan-list">
            {planItems.map((item) => (
              <p key={item}>
                <CheckCircle2 aria-hidden="true" size={16} />
                {item}
              </p>
            ))}
          </div>
          <div className="marketing-plan-actions">
            <ConversionCta label="Começar pelo Controle" />
          </div>
        </article>
      </section>

      <section className="marketing-proof-before-signup" aria-labelledby="proof-before-signup-title">
        <div>
          <p className="marketing-section-label">Antes de pagar</p>
          <h2 id="proof-before-signup-title">Veja se o Deniaros resolve sua rotina.</h2>
        </div>
        <p>
          Crie sua conta, monte sua primeira carteira e registre ou importe seus primeiros movimentos.
          A previsão aparece quando existe base real.
        </p>
        <ConversionCta label="Testar agora" />
      </section>

      <section className="marketing-weekly-ritual">
        <div>
          <p className="marketing-section-label">Mensagem central</p>
          <h2>O Deniaros não mostra apenas saldo. Ele mostra o que pode acontecer com seu dinheiro.</h2>
        </div>
        <p>Feche a semana antes que ela feche você.</p>
      </section>

      <section className="marketing-outcomes">
        <div className="marketing-outcome-card">
          <ShieldCheck aria-hidden="true" size={26} />
          <h2>O que muda na sua vida em poucos dias</h2>
          <p>Mais clareza para gastar, pagar, ajustar e decidir sem esperar o susto chegar.</p>
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

      <section className="marketing-feature-band">
        <div>
          <p className="marketing-section-label">Sistema completo, começo simples</p>
          <h2>Você não precisa de mais um app financeiro.</h2>
          <p>Você precisa de direção.</p>
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

      <section className="marketing-proof" aria-labelledby="roadmap-title">
        <div>
          <p className="marketing-section-label">Roadmap</p>
          <h2 id="roadmap-title">O que vem depois do Controle.</h2>
        </div>
        <div className="marketing-proof-grid">
          {futurePlans.map((plan) => (
            <p key={plan.title}>
              <ShieldCheck aria-hidden="true" size={17} />
              <strong>{plan.title}</strong> em desenvolvimento: {plan.description}
            </p>
          ))}
        </div>
      </section>

      <section className="marketing-proof" aria-labelledby="prova-social-title">
        <div>
          <p className="marketing-section-label">Confiança para operar dinheiro real</p>
          <h2 id="prova-social-title">Base moderna, experiência clássica e foco em decisão.</h2>
        </div>
        <div className="marketing-proof-grid">
          {proofPoints.map((proof) => (
            <p key={proof}>
              <ShieldCheck aria-hidden="true" size={17} />
              {proof}
            </p>
          ))}
        </div>
      </section>

      <section className="marketing-inline-cta" aria-label="Começar antes das perguntas frequentes">
        <div>
          <p className="marketing-section-label">Pronto para testar?</p>
          <h2>Você só precisa de uma carteira e alguns movimentos para começar.</h2>
        </div>
        <ConversionCta />
      </section>

      <section className="marketing-faq" aria-labelledby="faq-title">
        <div className="marketing-section-head marketing-section-head-narrow">
          <p className="marketing-section-label">Perguntas frequentes</p>
          <h2 id="faq-title">Antes de colocar sua vida financeira aqui.</h2>
        </div>
        <div className="marketing-faq-list">
          {faqs.map((faq) => (
            <details key={faq.question}>
              <summary>{faq.question}</summary>
              <p>{faq.answer}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="marketing-final-cta">
        <TrendingUp aria-hidden="true" size={32} />
        <p className="marketing-section-label">Controle com previsão</p>
        <h2>Pare de adivinhar. Comece a decidir.</h2>
        <p>Crie sua conta e veja sua previsão em minutos.</p>
        <ConversionCta />
      </section>
    </main>
  );
}
