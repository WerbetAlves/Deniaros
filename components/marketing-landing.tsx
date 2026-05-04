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
  "O dinheiro acaba e voce nao viu chegando.",
  "Voce registra gastos, mas nao enxerga o futuro.",
  "As contas ficam espalhadas e sem direcao.",
  "Voce vive apagando incendio."
];

const outcomes = [
  "Voce sabe exatamente quanto pode gastar.",
  "Voce ve o problema antes dele acontecer.",
  "Voce toma decisoes sem ansiedade.",
  "Voce para de apagar incendio.",
  "Voce comeca a ter controle real."
];

const journey = [
  {
    step: "01",
    title: "Organize sua base",
    description: "Registre ou importe seus dados rapidamente."
  },
  {
    step: "02",
    title: "Veja sua previsao",
    description: "O sistema mostra o que vai acontecer com seu dinheiro."
  },
  {
    step: "03",
    title: "Tome decisoes claras",
    description: "Voce sabe exatamente o que fazer agora."
  }
];

const features = [
  "Dashboard de decisao",
  "Agenda financeira com previsao",
  "Planejamento de dividas",
  "Orcamento com visao futura",
  "Relatorios inteligentes",
  "IA para orientacao"
];

const quickResults = [
  "Quanto voce pode gastar hoje",
  "Se vai faltar dinheiro no mes",
  "Onde esta o risco antes dele acontecer",
  "O que fazer agora"
];

export function MarketingLanding() {
  return (
    <main className="marketing-page">
      <Link className="marketing-mobile-sticky-cta" href="/login?mode=signup">
        Comecar gratis agora
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
            <small>Controle com previsao</small>
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
            Gestao financeira que olha para frente
          </p>
          <h1>Descubra hoje se seu dinheiro vai acabar antes do fim do mes.</h1>
          <p className="marketing-hero-lead">
            Veja quanto voce pode gastar hoje, o que vai acontecer com seu saldo e o que
            ajustar antes do problema chegar.
          </p>
          <div className="marketing-hero-actions">
            <Link className="marketing-primary marketing-primary-large marketing-hero-primary" href="/login?mode=signup">
              Comecar gratis agora
              <ArrowRight aria-hidden="true" size={18} />
            </Link>
            <Link className="marketing-secondary" href="#como-funciona">
              Ver como funciona
            </Link>
          </div>
          <div className="marketing-trust-row" aria-label="Compromissos do Deniaros">
            <span>
              <LineChart aria-hidden="true" size={16} />
              Previsao em minutos
            </span>
            <span>
              <WalletCards aria-hidden="true" size={16} />
              Base organizada
            </span>
            <span>
              <Brain aria-hidden="true" size={16} />
              Proxima acao clara
            </span>
          </div>
        </div>

        <div className="marketing-decision-board" aria-label="Exemplo de mesa de decisao Deniaros">
          <p className="marketing-board-kicker">Veja sua previsao antes do problema acontecer</p>
          <div className="marketing-board-header">
            <span>Mesa de decisao</span>
            <strong>Proximos 30 dias</strong>
          </div>
          <div className="marketing-balance-card">
            <span>Saldo projetado</span>
            <strong>R$ 5.086,32</strong>
            <small>Seu caixa previsto esta sob controle, sem surpresas no fim do mes.</small>
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

      <section className="marketing-quick-results" aria-labelledby="quick-results-title">
        <div>
          <p className="marketing-section-label">Resultado rapido</p>
          <h2 id="quick-results-title">Em 2 minutos voce ja sabe:</h2>
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
          <h2 id="problema-title">Voce so descobre o problema quando ja e tarde.</h2>
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
        <p>Aqui voce nao so organiza. Voce decide antes do problema acontecer.</p>
      </section>

      <section className="marketing-weekly-ritual">
        <div>
          <p className="marketing-section-label">Rotina de controle</p>
          <h2>Feche a semana antes que ela feche voce.</h2>
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
          <h2>Simples. Rapido. Direto.</h2>
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
          <p className="marketing-section-label">Direcao financeira</p>
          <h2>Voce nao precisa de mais um app financeiro.</h2>
          <p>Voce precisa de direcao.</p>
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
        <h2>Pare de adivinhar. Comece a decidir.</h2>
        <p>
          Crie sua conta gratuita e veja sua previsao em minutos.
        </p>
        <Link className="marketing-primary marketing-primary-large marketing-final-primary" href="/login?mode=signup">
          Comecar gratis agora
          <ArrowRight aria-hidden="true" size={18} />
        </Link>
      </section>
    </main>
  );
}
