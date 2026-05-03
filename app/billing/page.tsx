import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { openBillingPortal, requestPlanChange } from "@/app/billing/actions";
import { formatCurrency } from "@/lib/finance";
import {
  getPlanDisplayName,
  getPlanFeatureLabels,
  getPlanLimitLabels,
  getPlanPosition,
  getPlanSummary,
  getPublicPlanCatalog,
  planTierLabels,
  resolvePlanVisualTier,
  sortPlansByVisualTier,
  translateSubscriptionStatus,
  type SaasPlanLike,
  type SaasSubscriptionLike
} from "@/lib/saas-plans";
import { hasStripeSecretKey } from "@/lib/stripe";
import { getWorkspaceContext } from "@/lib/workspace-context";

type BillingSearchParams = {
  error?: string;
  success?: string;
};

type PlanRow = SaasPlanLike;

type SubscriptionRow = SaasSubscriptionLike & {
  current_period_starts_at: string | null;
  id: string;
  notes: string | null;
  seats: number;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  workspace_id: string | null;
};

export default async function BillingPage({
  searchParams
}: {
  searchParams: Promise<BillingSearchParams>;
}) {
  const { supabase, user, workspaceId } = await getWorkspaceContext();
  const { error, success } = await searchParams;
  const [subscriptionResult, plansResult] = await Promise.all([
      supabase
        .from("saas_subscriptions")
        .select("id,workspace_id,plan_id,status,seats,trial_ends_at,current_period_starts_at,current_period_ends_at,notes,stripe_customer_id,stripe_subscription_id")
        .eq("workspace_id", workspaceId)
        .eq("user_id", user.id)
        .maybeSingle<SubscriptionRow>(),
      supabase
        .from("saas_plans")
        .select("id,name,tier,price_cents,billing_interval,is_public,is_active,limits,features,stripe_price_id,stripe_product_id,stripe_lookup_key")
        .returns<PlanRow[]>()
  ]);
  const plans = sortPlansByVisualTier(plansResult.data ?? []);
  const subscription = subscriptionResult.data;
  const currentPlan = plans.find((plan) => plan.id === subscription?.plan_id) ?? null;
  const currentTier = resolvePlanVisualTier(currentPlan?.id ?? subscription?.plan_id, currentPlan?.tier);
  const publicPlans = getPublicPlanCatalog(plans, subscription?.plan_id);
  const familyPlan = plans.find((plan) => plan.id === "family");
  const loadError = subscriptionResult.error || plansResult.error;
  const isStripeConfigured = hasStripeSecretKey();
  const stripeReadyPlanCount = publicPlans.filter((plan) => plan.stripe_price_id || plan.stripe_lookup_key).length;
  const billingReadiness = getBillingReadiness({
    hasSubscription: Boolean(subscription),
    isStripeConfigured,
    stripeReadyPlanCount
  });

  return (
    <AppShell user={user} userEmail={user.email} workspaceId={workspaceId}>
      <section className="module-page billing-workspace">
        <div className={`module-hero panel billing-hero billing-tier-${currentTier}`}>
          <div>
            <p className="section-label">Assinatura e planos</p>
            <h2>{getPlanDisplayName(currentPlan)}</h2>
            <p className="supporting-copy">
              {currentPlan
                ? `${getPlanPosition(currentPlan)}. ${getPlanSummary(currentPlan)}`
                : "Sua assinatura ainda não foi criada no SaaS. Você pode solicitar um plano e acompanhar pelo suporte."}
            </p>
          </div>
          <div className={`billing-current-card billing-current-card-${currentTier}`}>
            <span>{currentPlan ? getPlanDisplayName(currentPlan).replace("Plano ", "") : planTierLabels[currentTier]}</span>
            <strong>{currentPlan ? formatPlanPrice(currentPlan) : "Sem cobrança"}</strong>
            <small>{translateSubscriptionStatus(subscription?.status)}</small>
          </div>
        </div>

        {error ? <p className="form-error">{error}</p> : null}
        {success ? <p className="form-success">{success}</p> : null}

        {loadError ? (
          <section className="source-banner">
            <strong>Catalogo parcialmente indisponivel</strong>
            <span>Nao conseguimos carregar todos os planos agora. Tente atualizar a pagina em instantes.</span>
          </section>
        ) : null}

        <section className="billing-status-grid">
          <article className="panel billing-status-card">
            <p className="section-label">Status</p>
            <strong>{translateSubscriptionStatus(subscription?.status)}</strong>
            <p>{getSubscriptionGuidance(subscription)}</p>
          </article>
          <article className="panel billing-status-card">
            <p className="section-label">Período</p>
            <strong>{formatSubscriptionPeriod(subscription)}</strong>
            <p>Datas comerciais aparecem aqui quando a assinatura estiver conectada ao faturamento.</p>
          </article>
          <article className="panel billing-status-card">
            <p className="section-label">Assentos</p>
            <strong>{subscription?.seats ?? 1}</strong>
            <p>Quantidade de usuários liberados para o workspace atual.</p>
          </article>
        </section>

        <section className={`panel billing-readiness-panel billing-readiness-${billingReadiness.tone}`}>
          <div>
            <p className="section-label">Prontidão de cobrança</p>
            <h3>{billingReadiness.title}</h3>
            <p>{billingReadiness.description}</p>
          </div>
          <div className="billing-readiness-steps" aria-label="Etapas de ativação da cobrança">
            <span className={subscription ? "is-done" : ""}>Plano no Deniaros</span>
            <span className={stripeReadyPlanCount ? "is-done" : ""}>Preço da Stripe</span>
            <span className={isStripeConfigured ? "is-done" : ""}>Checkout ativo</span>
          </div>
        </section>

        {subscription?.stripe_customer_id ? (
          <section className="panel billing-management-panel">
            <div className="panel-header">
              <div>
                <p className="section-label">Stripe conectado</p>
                <h3>Gerenciar cobrança e nota fiscal</h3>
              </div>
              <form action={openBillingPortal}>
                <button className="primary-button" type="submit">
                  Abrir portal da Stripe
                </button>
              </form>
            </div>
            <p className="supporting-copy">
              Use o portal seguro da Stripe para atualizar cartão, consultar faturas, revisar cobranças
              e cancelar renovação quando necessário.
            </p>
          </section>
        ) : null}

        <section className="panel billing-current-panel">
          <div className="panel-header">
            <div>
              <p className="section-label">Plano atual</p>
              <h3>O que está liberado agora</h3>
            </div>
            <span className={`topbar-plan-chip topbar-plan-chip-${currentTier} billing-plan-chip`}>
              Plano {planTierLabels[currentTier]}
            </span>
          </div>
          <div className="billing-feature-grid">
            <article>
              <strong>Recursos</strong>
              <ul>
                {getPlanFeatureLabels(currentPlan).length ? (
                  getPlanFeatureLabels(currentPlan).map((feature) => <li key={feature}>{feature}</li>)
                ) : (
                  <li>Recursos básicos do Deniaros</li>
                )}
              </ul>
            </article>
            <article>
              <strong>Limites</strong>
              <ul>
                {getPlanLimitLabels(currentPlan).length ? (
                  getPlanLimitLabels(currentPlan).map((limit) => <li key={limit}>{limit}</li>)
                ) : (
                  <li>Limites ainda não configurados</li>
                )}
              </ul>
            </article>
          </div>
        </section>

        <section className="billing-catalog-section">
          <div className="panel-header">
            <div>
              <p className="section-label">Catálogo público</p>
              <h3>Escolha o próximo nível</h3>
            </div>
            <Link className="ghost-button" href="/support">
              Falar com suporte
            </Link>
          </div>
          {familyPlan ? (
            <article className="panel billing-family-callout">
              <div>
                <p className="section-label">Plano Família</p>
                <h3>Ouro compartilhado para duas pessoas</h3>
                <p>
                  Ideal para casal ou família: titular e mais um usuário gerenciam contas próprias e
                  compartilhadas, com Open Finance individual quando liberado e visão consolidada.
                </p>
              </div>
              <strong>{formatPlanPrice(familyPlan)}</strong>
              <Link className="ghost-button" href="/settings/family">
                Gerenciar familia
              </Link>
            </article>
          ) : null}
          <div className="billing-plan-grid">
            {publicPlans.length ? (
              publicPlans.map((plan) => (
                <PlanCard
                  currentPlanId={subscription?.plan_id}
                  hasStripeCustomer={Boolean(subscription?.stripe_customer_id)}
                  isStripeConfigured={isStripeConfigured}
                  key={plan.id}
                  plan={plan}
                />
              ))
            ) : (
              <article className="panel empty-state">
                <strong>Nenhum plano público carregado.</strong>
                <p>Confirme as policies de leitura dos planos ou solicite suporte.</p>
              </article>
            )}
          </div>
        </section>

        <section className="panel billing-private-panel">
          <div>
            <p className="section-label">Plano privado</p>
            <h3>Platina não aparece para venda pública</h3>
            <p>
              O Platina é uma liberação manual para casos estratégicos. Ele pode aparecer aqui se já
              estiver ativo no seu workspace; caso contrário, a solicitação vira ticket para análise.
            </p>
          </div>
          <div className="billing-private-actions">
            <Link className="ghost-button" href="/support">
              Solicitar análise
            </Link>
          </div>
        </section>
      </section>
    </AppShell>
  );
}

function PlanCard({
  currentPlanId,
  hasStripeCustomer,
  isStripeConfigured,
  plan
}: {
  currentPlanId?: string;
  hasStripeCustomer?: boolean;
  isStripeConfigured: boolean;
  plan: PlanRow;
}) {
  const tier = resolvePlanVisualTier(plan.id, plan.tier);
  const isCurrent = currentPlanId === plan.id;
  const isStripeReady = Boolean(plan.stripe_price_id || plan.stripe_lookup_key);
  const canUseStripe = isStripeConfigured && isStripeReady;

  return (
    <article className={`panel billing-plan-card billing-tier-${tier}`}>
      <div>
        <div className="billing-plan-card-topline">
          <p className="section-label">{getPlanPosition(plan)}</p>
          <span className={`billing-plan-status ${getPlanStatusTone({ isCurrent, isStripeConfigured, isStripeReady })}`}>
            {getPlanStatusLabel({ isCurrent, isStripeConfigured, isStripeReady })}
          </span>
        </div>
        <h3>{getPlanDisplayName(plan)}</h3>
        <strong>{formatPlanPrice(plan)}</strong>
        <p>{getPlanSummary(plan)}</p>
      </div>
      <ul>
        {getPlanFeatureLabels(plan)
          .slice(0, 5)
          .map((feature) => (
            <li key={feature}>{feature}</li>
          ))}
      </ul>
      <form action={requestPlanChange}>
        <input name="planId" type="hidden" value={plan.id} />
        <input name="planName" type="hidden" value={getPlanDisplayName(plan)} />
        <input name="currentPlan" type="hidden" value={currentPlanId ?? "sem plano"} />
        <button
          className={isCurrent || (isStripeReady && !isStripeConfigured) ? "ghost-button" : "primary-button"}
          disabled={isCurrent || (isStripeReady && !isStripeConfigured)}
          type="submit"
        >
          {isCurrent
            ? "Plano atual"
            : canUseStripe
              ? hasStripeCustomer
                ? "Alterar pela Stripe"
                : "Assinar com Stripe"
              : isStripeReady
                ? "Checkout em ativação"
              : "Solicitar alteração"}
        </button>
      </form>
    </article>
  );
}

function formatPlanPrice(plan: PlanRow) {
  if (plan.billing_interval === "manual") {
    return "Liberação manual";
  }
  const interval = plan.billing_interval === "year" ? "ano" : "mês";
  return `${formatCurrency(plan.price_cents / 100, "BRL", "pt-BR")} / ${interval}`;
}

function getBillingReadiness({
  hasSubscription,
  isStripeConfigured,
  stripeReadyPlanCount
}: {
  hasSubscription: boolean;
  isStripeConfigured: boolean;
  stripeReadyPlanCount: number;
}) {
  if (isStripeConfigured && stripeReadyPlanCount > 0) {
    return {
      description:
        "O checkout pode receber assinaturas. Depois do pagamento, a Stripe avisa o Deniaros e o plano é atualizado automaticamente.",
      title: "Cobrança pronta para clientes reais",
      tone: "ready"
    };
  }

  if (stripeReadyPlanCount > 0) {
    return {
      description:
        "Os planos já têm chaves de preço. Falta publicar as variáveis da Stripe no ambiente para liberar o checkout.",
      title: "Stripe quase pronta",
      tone: "pending"
    };
  }

  return {
    description: hasSubscription
      ? "Seu plano atual está registrado, mas os preços da Stripe ainda precisam ser vinculados ao catálogo."
      : "Crie ou vincule os preços da Stripe para transformar os planos em assinatura sem depender de atendimento manual.",
    title: "Cobrança em configuração",
    tone: "manual"
  };
}

function getPlanStatusLabel({
  isCurrent,
  isStripeConfigured,
  isStripeReady
}: {
  isCurrent: boolean;
  isStripeConfigured: boolean;
  isStripeReady: boolean;
}) {
  if (isCurrent) {
    return "Ativo";
  }
  if (isStripeReady && isStripeConfigured) {
    return "Checkout";
  }
  if (isStripeReady) {
    return "Aguardando env";
  }
  return "Manual";
}

function getPlanStatusTone({
  isCurrent,
  isStripeConfigured,
  isStripeReady
}: {
  isCurrent: boolean;
  isStripeConfigured: boolean;
  isStripeReady: boolean;
}) {
  if (isCurrent || (isStripeReady && isStripeConfigured)) {
    return "is-ready";
  }
  if (isStripeReady) {
    return "is-pending";
  }
  return "is-manual";
}

function formatSubscriptionPeriod(subscription?: SubscriptionRow | null) {
  const start = subscription?.current_period_starts_at ?? subscription?.trial_ends_at;
  const end = subscription?.current_period_ends_at ?? subscription?.trial_ends_at;

  if (!start && !end) {
    return "Sem período";
  }

  if (start && end && start !== end) {
    return `${formatDate(start)} até ${formatDate(end)}`;
  }

  return end ? `Até ${formatDate(end)}` : `Desde ${formatDate(start as string)}`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(new Date(value));
}

function getSubscriptionGuidance(subscription?: SubscriptionRow | null) {
  if (!subscription) {
    return "Solicite um plano para ativar o faturamento e os limites do workspace.";
  }
  if (subscription.status === "past_due") {
    return "Há pendência de pagamento. Regularize para evitar bloqueio de recursos.";
  }
  if (subscription.status === "trialing") {
    return "Você está em validação. Este é o melhor momento para configurar dados reais.";
  }
  if (subscription.status === "manual") {
    return "Liberação manual ativa, normalmente usada para acordos privados ou estratégicos.";
  }
  if (subscription.status === "suspended" || subscription.status === "canceled") {
    return "Assinatura sem acesso comercial pleno. Fale com suporte para reativação.";
  }
  return "Assinatura ativa e pronta para uso normal.";
}
