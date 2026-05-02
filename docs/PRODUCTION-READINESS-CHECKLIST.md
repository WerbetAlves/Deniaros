# Checklist de producao do Deniaros

Use este roteiro antes de liberar clientes reais.

## 1. Ambiente

- `NEXT_PUBLIC_APP_URL` aponta para o dominio de producao.
- `NEXT_PUBLIC_SUPABASE_URL` aponta para o projeto Supabase correto.
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` configurada na Vercel.
- `SUPABASE_SERVICE_ROLE_KEY` configurada somente no ambiente server.
- `GEMINI_API_KEY` configurada para o Consultor IA.
- `STRIPE_SECRET_KEY` configurada com a chave do modo correto.
- `STRIPE_WEBHOOK_SECRET` configurada com o secret do endpoint de producao.
- `DENIAROS_ALLOW_SAMPLE_DATA` ausente ou `0` em producao.

## 2. Supabase

- Todas as migrations de `0001` ate `0027` foram aplicadas.
- Site URL esta no dominio de producao.
- Redirect URLs incluem:
  - `/auth/callback`
  - `/login`
  - `/reset-password`
- Google OAuth aponta para o callback correto do Supabase.
- Usuario fundador possui permissao administrativa/founder.
- RLS validada com dois usuarios diferentes.

## 3. Stripe

- Produtos e precos criados para Bronze, Prata, Ouro e Familia.
- Lookup keys ou Price IDs preenchidos em `saas_plans`.
- Plano Platina Privado continua manual.
- Webhook aponta para `/api/stripe/webhook`.
- Eventos ativos:
  - `checkout.session.completed`
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.payment_failed`
- Checkout cria assinatura.
- Webhook atualiza `saas_subscriptions`.
- Portal da Stripe abre para cliente com assinatura ativa.
- Cancelamento e falha de pagamento atualizam status no Deniaros.

## 4. Smoke test de cliente real

- Criar conta nova por e-mail.
- Entrar com Google.
- Recuperar senha.
- Criar workspace sem duplicidade.
- Completar Perfil Pessoal.
- Criar carteira fisica ou conta manual.
- Criar movimento.
- Criar conta a pagar ou deposito.
- Ver previsao de saldo.
- Conversar com o Consultor IA.
- Abrir ticket de suporte.
- Assinar um plano pela Stripe.
- Confirmar plano refletido no topo, billing e admin.
- Testar Home, Carteiras, Agenda, Relatorios e Consultor IA no celular.

## 5. Criterio de bloqueio

Nao liberar clientes reais se:

- Usuario autenticado ve dados de amostra.
- Checkout nao volta para o Deniaros.
- Webhook nao sincroniza assinatura.
- Admin SaaS aparece para usuario comum.
- Dados de um usuario aparecem para outro.
- Mobile impede navegar, registrar movimento ou abrir suporte.
