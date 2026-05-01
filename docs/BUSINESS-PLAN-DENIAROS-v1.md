# BUSINESS PLAN - DENIAROS (v1)

Data: 26/04/2026  
Versao: 1.0 (executiva)  
Status: pronto para execucao

---

## 1) One-Page Plan (resumo executivo)

### 1.1 Visao
Ser a plataforma de controle financeiro pessoal mais confiavel para quem quer previsao real, sem perder simplicidade.

### 1.2 Missao
Dar ao usuario dominio financeiro diario com a combinacao de metodo classico (estilo Money99), automacao moderna e IA orientada a decisao.

### 1.3 Problema que resolvemos
- Falta de visao consolidada entre contas, carteiras, cartoes e metas.
- Planejamento financeiro reativo (sem previsao de caixa).
- Dificuldade de transformar dados em decisoes praticas.

### 1.4 Solucao
Deniaros entrega:
- Controle financeiro completo e organizado.
- Planejamento acionavel (contas, metas, debitos, orcamento).
- IA estrategica para alertas e recomendacoes.
- Estrutura multiplataforma: Web + Windows + App.

### 1.5 ICP (perfil de cliente ideal)
- Autonomos e pequenos empreendedores.
- Casais/familias que querem governanca financeira.
- Usuarios que ja tentaram planilhas ou apps bancarios, mas sentem falta de previsao.

### 1.6 Diferenciais competitivos
- Essencia classica de controle (alta confianca e profundidade).
- IA integrada para decisao (nao so chatbot generico).
- Base pronta para internacionalizacao.
- Trilha de onboarding com perfil pessoal e planejamento inicial.

### 1.7 Modelo de receita
- Plano Free (entrada e validacao de produto).
- Plano Pro (assinatura mensal principal).
- Plano Family/Business Lite (multiusuario e suporte prioritario).
- Futuro: add-ons (Open Finance premium, relatorios fiscais, automacoes avancadas).

### 1.8 Meta de 12 meses
- 250 assinantes pagantes.
- Ticket medio alvo: R$ 49/mes.
- MRR alvo: R$ 12.250.
- Retencao D30 > 35% e churn mensal <= 5% na fase inicial.

---

## 2) Produto e estrategia de valor

### 2.1 Oferta de produto (MVP comercial)
1. Home Page (dashboard financeiro + saude financeira).
2. Carteiras (contas, bancos, carteira fisica).
3. Contas a pagar e receber.
4. Planejador financeiro.
5. Relatorios e visoes.
6. Perfil pessoal e inventario domestico.
7. Chat e suporte (IA + abertura de ticket).

### 2.2 Promessa central da marca
"Controle com previsao."

### 2.3 Funcao do onboarding
- Levar o usuario ao primeiro valor em ate 10 minutos.
- Etapas alvo:
1. Criar primeira carteira.
2. Fazer primeiro lancamento.
3. Configurar perfil pessoal.
- Resultado esperado: aumento de ativacao e retencao.

---

## 3) Estrategia comercial e go-to-market

### 3.1 Canais de aquisicao (fase inicial)
- Conteudo organico (YouTube, Instagram, TikTok, LinkedIn).
- Landing page com trial.
- Comunidades de financas e produtividade.
- Parcerias com contadores e criadores de conteudo.

### 3.2 Funil comercial padrao
1. Trafego -> landing page.
2. Cadastro no trial (14 dias).
3. Onboarding guiado.
4. Conversao para plano pago.
5. Retencao via relatorios, alertas e rotina semanal.

### 3.3 Proposta de preco inicial (hipotese)
- Free: R$ 0
- Pro: R$ 39 a R$ 59/mes (testar elasticidade)
- Family/Business Lite: R$ 79 a R$ 129/mes

### 3.4 Oferta de lancamento sugerida
- 30 dias por preco promocional para primeiros usuarios.
- Bonus: template premium de planejamento + sessao de onboarding gravada.

---

## 4) Metricas de negocio (north star + operacionais)

### 4.1 North Star Metric
Usuarios ativos que concluem rotina financeira semanal (>= 1 sessao util por semana).

### 4.2 KPIs obrigatorios
- Activation 24h: % que cria carteira + lanca transacao + define meta.
- Trial -> Pago: taxa de conversao.
- Retencao D7/D30.
- Churn mensal.
- CAC (custo por cliente adquirido).
- LTV/CAC.
- MRR (receita recorrente mensal).

### 4.3 Metas dos primeiros 90 dias
- 1.000 leads.
- 150 trials.
- 30 a 50 assinantes pagantes.
- Conversao trial->pago >= 12%.
- Churn <= 6% (fase inicial).

---

## 5) Estrutura operacional

### 5.1 Stack e operacao
- Produto: Next.js + Supabase + Vercel.
- Pagamento: Stripe.
- IA: Gemini (evoluindo para camada de orquestracao).
- Suporte: IA primeiro nivel + ticket humano.

### 5.2 Governanca minima
- Politica de privacidade e termos de uso publicados.
- LGPD: base legal, consentimento e exportacao/exclusao de dados.
- Processo de backup e restauracao.
- Log de auditoria basico para acoes criticas.

### 5.3 Rotina de operacao semanal (fundador)
- 1 dia: produto (prioridades e release).
- 2 dias: growth e conteudo.
- 1 dia: vendas/parcerias.
- 1 dia: atendimento, dados e melhoria de churn.

---

## 6) Projecao financeira simplificada (12 meses)

### 6.1 Premissas
- Ticket medio: R$ 49/mes.
- Crescimento de base paga gradual apos validacao de funil.
- Custos fixos iniciais baixos (operacao enxuta).

### 6.2 Cenarios

| Cenario | Assinantes M12 | Ticket medio | MRR M12 |
|---|---:|---:|---:|
| Conservador | 120 | R$ 45 | R$ 5.400 |
| Base | 250 | R$ 49 | R$ 12.250 |
| Agressivo | 450 | R$ 55 | R$ 24.750 |

### 6.3 Estrutura de custos mensais (estimativa)

| Categoria | Faixa mensal |
|---|---:|
| Infra (Vercel/Supabase/servicos) | R$ 400 - R$ 1.500 |
| Ferramentas (design, analytics, automacao) | R$ 200 - R$ 700 |
| Marketing e distribuicao | R$ 500 - R$ 3.000 |
| Operacao (dominio, suporte, imprevistos) | R$ 300 - R$ 1.000 |
| Total estimado | R$ 1.400 - R$ 6.200 |

---

## 7) Cronograma de execucao (8 semanas)

### Semana 1 - Fundacao comercial
- Definir oferta, precos iniciais e proposta da landing.
- Fechar mensagens-chave de posicionamento.
- Configurar tracking (eventos de funil).

### Semana 2 - Conversao
- Publicar landing page v1 com CTA de trial.
- Criar onboarding guiado com checklist.
- Configurar e-mail transacional basico.

### Semana 3 - Aquecimento de demanda
- Iniciar calendario de conteudo (3 pecas/semana).
- Publicar comparativo de valor (antes x depois).
- Iniciar lista de espera/primeiros testers.

### Semana 4 - Retencao inicial
- Melhorar painel de saude financeira.
- Revisar alertas de risco e recomendações IA.
- Implantar ritual de "rotina semanal" no produto.

### Semana 5 - Monetizacao
- Ativar checkout Stripe em producao.
- Testar 2 pacotes de preco (A/B simples).
- Criar pagina de planos e FAQ comercial.

### Semana 6 - Escala de aquisicao
- Parcerias com 3 creators/afiliados piloto.
- Campanha de indicacao de usuarios.
- Criar prova social com casos reais iniciais.

### Semana 7 - Otimizacao de funil
- Revisar gargalos trial->pago.
- Melhorar copy de onboarding e paywall.
- Implementar campanhas de recuperacao de abandono.

### Semana 8 - Fechamento do ciclo
- Revisao de KPIs dos 60 dias.
- Definicao de roadmap do trimestre seguinte.
- Planejamento de internacionalizacao (idioma + moeda).

---

## 8) Orcamento de execucao (90 dias)

### 8.1 Orcamento recomendado por faixa

| Faixa | Objetivo | Valor/90 dias |
|---|---|---:|
| Minimo viavel | Validar funil e ativar primeiras vendas | R$ 4.000 |
| Base recomendado | Crescer com consistencia | R$ 9.000 |
| Acelerado | Escalar distribuicao com testes de canal | R$ 18.000 |

### 8.2 Distribuicao sugerida (faixa base R$ 9.000)
- Conteudo e design: 20% (R$ 1.800)
- Trafego e distribuicao: 35% (R$ 3.150)
- Ferramentas e infra extra: 20% (R$ 1.800)
- Parcerias/afiliados: 15% (R$ 1.350)
- Reserva operacional: 10% (R$ 900)

---

## 9) Riscos principais e mitigacao

### Risco 1: baixa conversao para pago
- Mitigacao: revisar onboarding, oferta e prova de valor em 7 dias.

### Risco 2: churn alto no inicio
- Mitigacao: rotina semanal assistida + alertas de inatividade + suporte proativo.

### Risco 3: dependencia de um unico canal de aquisicao
- Mitigacao: operar pelo menos 3 canais em paralelo (conteudo, parceria, indicacao).

### Risco 4: escopo de produto inflado
- Mitigacao: manter backlog orientado por impacto em ativacao/retencao/receita.

---

## 10) Governanca de decisao (ritual semanal)

### Reuniao semanal de negocio (60 min)
1. KPI review (15 min): ativacao, retencao, conversao, churn, MRR.
2. Oportunidades e bloqueios (15 min).
3. Top 3 prioridades da semana (20 min).
4. Responsaveis, prazo e criterio de sucesso (10 min).

### Scorecard semanal (modelo)

| KPI | Meta | Resultado | Status | Acao da semana |
|---|---:|---:|---|---|
| Leads | 250/mes |  |  |  |
| Trials | 40/mes |  |  |  |
| Conversao Trial->Pago | >= 12% |  |  |  |
| Retencao D30 | >= 35% |  |  |  |
| Churn mensal | <= 5% |  |  |  |
| MRR | crescimento continuo |  |  |  |

---

## 11) Checklist de proximos 7 dias (acao imediata)

1. Publicar este plano como documento oficial da startup.
2. Fechar tabela de precos v1 e regras de trial.
3. Publicar landing page comercial com CTA de cadastro.
4. Instrumentar eventos essenciais de funil.
5. Definir calendario de conteudo para 4 semanas.
6. Abrir canal de suporte (IA + ticket humano).
7. Rodar primeira reuniao de scorecard semanal.

---

## 12) Anexo - Mensagem comercial curta (pitch)

"A Deniaros une a confianca do controle financeiro classico com inteligencia moderna para transformar dados em decisoes claras. Em vez de reagir ao dinheiro, o usuario passa a comandar o proprio futuro financeiro com previsao."

