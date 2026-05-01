# Stripe Billing no Deniaros

## Variaveis necessarias

Configure no ambiente da aplicacao:

```env
SUPABASE_SERVICE_ROLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_APP_URL=https://seu-dominio.com
```

Em desenvolvimento, use:

```env
NEXT_PUBLIC_APP_URL=http://127.0.0.1:3000
```

Nunca coloque `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` ou `SUPABASE_SERVICE_ROLE_KEY`
em codigo versionado. Se uma chave for exposta em chat, log ou print, rotacione a chave.

## Webhook

Crie um endpoint na Stripe apontando para:

```text
https://seu-dominio.com/api/stripe/webhook
```

Eventos usados pelo Deniaros:

```text
checkout.session.completed
customer.subscription.created
customer.subscription.updated
customer.subscription.deleted
invoice.payment_failed
```

Em desenvolvimento com Stripe CLI, encaminhe o webhook para:

```text
http://127.0.0.1:3000/api/stripe/webhook
```

## Catalogo

Aplique a migration `0022_stripe_billing_connection.sql`.

O Deniaros aceita duas formas de vinculo com a Stripe:

- `stripe_price_id`: usa diretamente o Price ID, como `price_...`.
- `stripe_lookup_key`: segue o padrao do exemplo oficial da Stripe e localiza o Price ativo pela lookup key.

Recomendado para operacao: configure `stripe_lookup_key` com nomes estaveis:

```sql
update public.saas_plans
set stripe_lookup_key = 'deniaros_bronze_monthly'
where id = 'free';

update public.saas_plans
set stripe_lookup_key = 'deniaros_silver_monthly'
where id = 'pro';

update public.saas_plans
set stripe_lookup_key = 'deniaros_gold_monthly'
where id = 'business_lite';

update public.saas_plans
set stripe_lookup_key = 'deniaros_family_monthly'
where id = 'family';
```

Se preferir Price ID direto, preencha `stripe_price_id` no lugar de `stripe_lookup_key`.

O plano `platinum_private` continua manual e nao precisa aparecer no Checkout publico.

## Fluxo esperado

1. Usuario escolhe um plano em `/billing`.
2. Deniaros cria uma sessao Checkout na Stripe.
3. Stripe confirma a assinatura pelo webhook.
4. Deniaros sincroniza `saas_subscriptions` com plano, status, periodo, cliente e assinatura Stripe.
5. Usuario passa a ver o botao do Customer Portal para cartao, faturas e cancelamento.
