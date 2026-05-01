# Homologacao da Importacao (Passo 01)

Este roteiro valida o fluxo completo:

- criar regra automatica
- importar CSV
- conferir deduplicacao
- revisar pendentes
- conciliar em lote

## Pre-requisitos

1. App rodando em `http://localhost:3000`.
2. Migration `supabase/migrations/0005_import_rules.sql` aplicada no Supabase.
3. Usuario autenticado no app.

## Arquivo de teste

Use este fixture:

- `docs/fixtures/import-homologacao.csv`

Ele contem:

- 5 linhas
- 1 linha duplicada proposital
- receitas e despesas

## Roteiro

### 1) Criar regra de importacao

Na tela `/imports`, crie esta regra:

- Nome: `Energia em Moradia`
- Campo para comparar: `Descricao`
- Tipo de comparacao: `Contem`
- Texto padrao: `energia`
- Escopo da conta: `Todas as contas` (ou a conta alvo)
- Prioridade: `10`
- Definir categoria: escolha `Moradia / Utilidades` (ou equivalente)
- Definir favorecido: escolha `Conta de energia` (opcional)
- Status de entrada: `Marcar como pendente`

Salve a regra.

### 2) Importar o CSV

Ainda em `/imports`:

1. Selecione a conta de destino.
2. Mantenha `Criar favorecidos automaticamente` ligado.
3. Envie o arquivo `docs/fixtures/import-homologacao.csv`.
4. Clique em `Importar extrato`.

### 3) Validar resultado esperado

No retorno da importacao:

- deve informar `1 duplicado ignorado`
- deve informar movimentos importados (esperado: `4`)
- deve informar quantos movimentos receberam regra automatica (esperado: ao menos `1`)

Na revisao de pendentes:

- as linhas importadas aparecem com `source = imported`
- a linha com `energia` deve respeitar categoria/favorecido/status da regra

### 4) Conciliacao em lote

Na lista de pendentes importados:

1. Marque 2 itens.
2. Clique em `Marcar selecionados como lancados`.
3. Confirme que o contador de pendentes diminuiu.

Depois:

1. Marque 1 item.
2. Clique em `Remover selecionados`.
3. Confirme que o item sumiu da lista.

### 5) Validacao final em Registro

Abra:

- `/transactions?source=imported&status=all`

Verifique:

- itens conciliados com `status = posted`
- itens nao conciliados com `status = pending`
- item removido nao aparece mais

## Criterio de aprovado

Homologacao aprovada quando:

- regra automatica aplica corretamente
- deduplicacao ignora repeticao no mesmo arquivo
- conciliacao em lote altera status corretamente
- remocao em lote remove apenas os selecionados
