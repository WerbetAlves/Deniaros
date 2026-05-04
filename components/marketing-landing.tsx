import {
  ArrowRight,
  Brain,
  CheckCircle2,
  LineChart,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  WalletCards
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";

const painPoints = [
  "O dinheiro acaba e você não viu chegando.",
  "Você registra gastos, mas não enxerga o futuro.",
  "As contas ficam espalhadas e sem direção.",
  "Você vive apagando incêndio."
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
    step: "01",
    title: "Organize sua base",
    description: "Registre ou importe seus dados rapidamente."
  },
  {
    step: "02",
    title: "Veja sua previsão",
    description: "O sistema mostra o que vai acontecer com seu dinheiro."
  },
  {
    step: "03",
    title: "Tome decisões claras",
    description: "Você sabe exatamente o que fazer agora."
  }
];

const features = [
  "Dashboard de decisão",
  "Agenda financeira com previsão",
  "Planejamento de dívidas",
  "Orçamento com visão futura",
  "Relatórios inteligentes",
  "IA para orientação"
];

const quickResults = [
  "Quanto você pode gastar hoje",
  "Se vai faltar dinheiro no mês",
  "Onde está o risco antes dele acontecer",
  "O que fazer agora"
];

const proofPoints = [
  "Seus dados protegidos por criptografia de nível bancário.",
  "Pagamentos processados com segurança mundial (padrão Stripe).",
  "Privacidade total: você no controle do que a IA acessa.",
  "Infraestrutura robusta que garante que seus dados nunca se percam."
];

const faqs = [
  {
    question: "Meus dados financeiros ficam seguros?",
    answer:
      "Sim. O Deniaros foi desenhado com autenticação, permissões, auditoria, backup e controles de privacidade para proteger o workspace financeiro."
  },
  {
    question: "Preciso conectar banco para usar?",
    answer:
      "Não. Você pode começar registrando ou importando dados manualmente. A conexão Open Finance entra como evolução para automatizar ainda mais a rotina."
  },
  {
    question: "A IA vê todos os meus dados?",
    answer:
      "A IA usa apenas o contexto financeiro necessário para orientar sua decisão dentro do Deniaros, com foco em saldo, agenda, riscos e próximas ações."
  },
  {
    question: "Consigo testar antes de pagar?",
    answer:
      "Sim. A proposta é permitir que você veja sua previsão em minutos e entenda se o Deniaros resolve sua rotina antes de assumir um plano pago."
  }
];

export function MarketingLanding() {
  return (
    <main className="marketing-page">
      <Link className="marketing-mobile-sticky-cta" href="/login?mode=signup">
        Começar grátis agora
        <ArrowRight aria-hidden="true" size={16} />
      </Link>
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
        <div className="marketing-hero-copy">
          <p className="marketing-eyebrow">
            <Sparkles aria-hidden="true" size={16} />
            Gestão financeira que olha para frente
          </p>
          <h1>Descubra hoje se seu dinheiro vai acabar antes do fim do mês.</h1>
          <p className="marketing-hero-lead">
            O único sistema que não foca apenas no que você gastou, mas no que vai 
            acontecer com seu saldo nos próximos 90 dias. Tome decisões sem ansiedade.
          </p>
          <div className="marketing-hero-actions">
            <div className="marketing-hero-cta-wrapper">
              <Link className="marketing-primary marketing-primary-large marketing-hero-primary" href="/login?mode=signup">
                Começar grátis agora
                <ArrowRight aria-hidden="true" size={18} />
              </Link>
              <small className="marketing-cta-note">✓ Não precisa de cartão de crédito</small>
            </div>
            <Link className="marketing-secondary" href="#como-funciona">
              Ver como funciona
            </Link>
          </div>
          <div className="marketing-trust-row" aria-label="Compromissos do Deniaros">
            <span>
              <LineChart aria-hidden="true" size={16} />
              Previsão em minutos
            </span>
            <span>
              <WalletCards aria-hidden="true" size={16} />
              Base organizada
            </span>
            <span>
              <Brain aria-hidden="true" size={16} />
              Próxima ação clara
            </span>
          </div>
        </div>

        <div className="marketing-decision-board" aria-label="Exemplo de mesa de decisão Deniaros">
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
      </section>

      <section className="marketing-quick-results" aria-labelledby="quick-results-title">
        <div>
          <p className="marketing-section-label">Resultado rápido</p>
          <h2 id="quick-results-title">Em 2 minutos você já sabe:</h2>
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

      <section className="marketing-problem" aria-labelledby="problema-title">
        <div>
          <p className="marketing-section-label">O problema real</p>
          <h2 id="problema-title">Você só descobre o problema quando já é tarde.</h2>
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

      <section className="marketing-turning-point">
        <div>
          <p className="marketing-section-label">Virada de chave</p>
          <h2>
            A maioria dos apps mostra o passado.
            <br />
            O Deniaros te mostra o que vem pela frente.
          </h2>
        </div>
        <p>Aqui você não só organiza. Você decide antes do problema acontecer.</p>
      </section>

      <section className="marketing-ai-advisor" aria-labelledby="ai-advisor-title">
        <div className="marketing-ai-advisor-head">
          <p className="marketing-section-label">Inteligência que orienta</p>
          <h2 id="ai-advisor-title">Um consultor financeiro 24h à sua disposição.</h2>
          <p>
            Pergunte em linguagem natural e receba insights baseados na sua realidade,
            não em fórmulas genéricas.
          </p>
        </div>
        <div className="marketing-ai-sim">
          <div className="marketing-ai-chat-box">
            <div className="marketing-ai-msg user">
              <p>Deniaros, posso trocar de carro no mês que vem?</p>
            </div>
            <div className="marketing-ai-msg assistant">
              <div className="marketing-ai-thinking">
                <Sparkles aria-hidden="true" size={14} className="pulse" />
                Analisando sua projeção de 90 dias...
              </div>
              <div className="marketing-ai-answer">
                <p>
                  <strong>Não recomendo agora.</strong> Seu menor saldo previsto será de <strong>R$ 840,00</strong> no dia 15 devido ao IPVA e seguro. 
                </p>
                <p>
                  Se você adiar a troca para <strong>abril</strong>, terá uma margem de segurança de R$ 3.200,00.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="marketing-weekly-ritual">
        <div>
          <p className="marketing-section-label">Rotina de controle</p>
          <h2>Feche a semana antes que ela feche você.</h2>
        </div>
        <p>
          O Deniaros te guia semanalmente para manter controle, prever riscos e agir com clareza.
        </p>
      </section>

      <section className="marketing-outcomes">
        <div className="marketing-outcome-card">
          <ShieldCheck aria-hidden="true" size={26} />
          <h2>O que muda na sua vida em poucos dias</h2>
          <p>
            Mais clareza para gastar, pagar, ajustar e decidir sem esperar o susto chegar.
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

      <section className="marketing-feature-band">
        <div>
          <p className="marketing-section-label">Direção financeira</p>
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
        <p>
          Crie sua conta gratuita e veja sua previsão em minutos.
        </p>
        <Link className="marketing-primary marketing-primary-large marketing-final-primary" href="/login?mode=signup">
          Começar grátis agora
          <ArrowRight aria-hidden="true" size={18} />
        </Link>
      </section>
    </main>
  );
}
