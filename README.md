# Deniaros App

Base inicial do app web do Deniaros.

## Objetivo desta pasta

- servir como primeira superficie real do produto
- concentrar o dashboard autenticado
- virar a base compartilhada da futura versao desktop
- preparar a futura publicacao via GitHub, Supabase e Vercel

## Ambiente

Crie um `.env.local` com base no `.env.example` quando o projeto Supabase estiver pronto.

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Rodar localmente

```bash
npm.cmd install
npm.cmd run dev -- --hostname localhost --port 3000
```

## Checks antes de deploy

```bash
npm.cmd run typecheck
npm.cmd test
npm.cmd run test:e2e
npm.cmd run build
```

Ou rode tudo em uma passada:

```bash
npm.cmd run quality
```

### E2E de cliente real

Os testes Playwright rodam smoke público em desktop e celular. O fluxo autenticado real fica pronto para
homologação com um usuário limpo quando estas variáveis forem informadas:

```bash
E2E_USER_EMAIL=cliente.teste@exemplo.com
E2E_USER_PASSWORD=senha-segura
E2E_ALLOW_MUTATION=1
npm.cmd run test:e2e
```

Sem `E2E_ALLOW_MUTATION=1`, o teste não cria lançamento nem compromisso financeiro.

## Beta com clientes reais

- checklist: [docs/client-beta-checklist.md](./docs/client-beta-checklist.md)
- backup do workspace: `Configurações > Backup e restauração`
- export direto autenticado: `/api/export/workspace`
- CI do GitHub: `.github/workflows/ci.yml`

Antes de publicar, confirme que `.env.local` não será enviado ao GitHub e que chaves reais foram
configuradas apenas no provedor de hospedagem.

## Stripe

O checkout usa os planos pagos do banco por `stripe_price_id` ou `stripe_lookup_key`.

Variaveis necessarias no Vercel:

```bash
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_APP_URL=https://deniaros.vercel.app
SUPABASE_SERVICE_ROLE_KEY=...
```

Crie Prices recorrentes na Stripe com estas lookup keys, ou preencha `stripe_price_id`
diretamente em `saas_plans`:

- `deniaros_silver_monthly` para Plano Prata
- `deniaros_gold_monthly` para Plano Ouro
- `deniaros_family_monthly` para Plano Familia

Webhook de producao:

```text
https://deniaros.vercel.app/api/stripe/webhook
```

Eventos usados: `checkout.session.completed`, `customer.subscription.created`,
`customer.subscription.updated`, `customer.subscription.deleted` e `invoice.payment_failed`.

## Homologacao do passo 01 (importacao)

- roteiro: [docs/homologacao-importacao.md](./docs/homologacao-importacao.md)
- arquivo de teste: [docs/fixtures/import-homologacao.csv](./docs/fixtures/import-homologacao.csv)

## Modulos principais ja implementados

- autenticacao (email/senha, cadastro, recuperacao, Google)
- dashboard financeiro
- contas, categorias, favorecidos e lancamentos
- importacao de CSV com conciliacao em lote
- regras de importacao (`import_rules`)
- agenda financeira, relatorios e planejador
- perfil pessoal, inventario domestico e categorias de imposto
- perfil do usuario (tema, fonte, densidade, avatar)
- onboarding de primeira abertura com Perfil Pessoal (paridade Money99)

Veja tambem [SUPABASE-SETUP.md](./SUPABASE-SETUP.md).
