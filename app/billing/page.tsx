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
          <div className="billing-current-card">
            <span>{currentPlan ? getPlanDisplayName(currentPlan).replace("Plano ", "") : planTierLabels[currentTier]}</span>
            <strong>{currentPlan ? formatPlanPrice(currentPlan) : "Sem cobrança"}</strong>
            <small>{translateSubscriptionStatus(subscription?.status)}</small>
          </div>
        </div>

        {error ? <p className="form-error">{error}</p> : null}
        {success ? <p className="form-success">{success}</p> : null}

        {loadError ? (
          <section className="source-banner">
            <strong>Catálogo parcialmente indisponível</strong>
            <span>Aplique a migration 0019_saas_plan_user_catalog.sql para liberar a leitura dos planos ao usuário.</span>
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
            <span className={`topbar-plan-chip billing-plan-chip topbar-plan-${currentTier}`}>
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
            </article>
          ) : null}
          <div className="billing-plan-grid">
            {publicPlans.length ? (
              publicPlans.map((plan) => (
                <PlanCard
                  currentPlanId={subscription?.plan_id}
                  hasStripeCustomer={Boolean(subscription?.stripe_customer_id)}
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
  plan
}: {
  currentPlanId?: string;
  hasStripeCustomer?: boolean;
  plan: PlanRow;
}) {
  const tier = resolvePlanVisualTier(plan.id, plan.tier);
  const isCurrent = currentPlanId === plan.id;
  const isStripeReady = Boolean(plan.stripe_price_id || plan.stripe_lookup_key);

  return (
    <article className={`panel billing-plan-card billing-tier-${tier}`}>
      <div>
        <p className="section-label">{getPlanPosition(plan)}</p>
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
        <button className={isCurrent ? "ghost-button" : "primary-button"} disabled={isCurrent} type="submit">
          {isCurrent
            ? "Plano atual"
            : isStripeReady
              ? hasStripeCustomer
                ? "Alterar pela Stripe"
                : "Assinar com Stripe"
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
