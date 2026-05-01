# Paridade Money 99 - Novos recursos

Este documento acompanha a comparação entre o manual do Money 99 e o Deniaros. A regra de produto é simples: preservar a intenção clássica, mas entregar a versão moderna quando o recurso antigo estiver datado.

## Descubra o que há de novo no Money 99

| Recurso do Money 99 | Paridade no Deniaros | Status | Próxima evolução |
| --- | --- | --- | --- |
| Perfil pessoal | Existe em `/personal-profile`, com questionário clássico, contexto familiar e preferências financeiras. | Forte | Gerar plano de ação automático ao concluir o perfil. |
| Home page financeira | Existe em `/`, com saldo, previsão, saúde financeira, trajetória e atalhos. | Forte | Adicionar personalização de widgets e leitura diária do Consultor IA. |
| Notícias financeiras | Não existe como feed editorial. | Lacuna consciente | Substituir por “sinais financeiros relevantes”: juros, câmbio, inflação, alertas de Open Finance e notícias opcionais por interesse. |
| Alertas do Consultor financeiro | Existe no topo, mas estava básico. | Em evolução | Alertas agora consideram compromissos vencidos, próximos vencimentos e relação receitas vs. despesas do mês. |
| Centro de decisões | Existe em `/decisions`, mas ainda é uma casca com inventário e roadmap. | Fraco | Criar simuladores de decisão: comprar, quitar dívida, trocar assinatura, antecipar pagamento, formar reserva. |
| Ajuda para usuários do Quicken | Categorias e subcategorias existem em `/categories`, com lista única e hierarquia. | Parcial | Adicionar importação/mapeamento Quicken/QIF com assistente de compatibilidade. |
| Planejador de orçamento | Existe em `/planner?view=budget`. | Bom | Tornar mais guiado: renda, poupança, fundo ocasional, débitos, despesas e previsão como etapas claras. |
| Contas a pagar e depósitos | Existe em `/financial-agenda`, com recorrência, calendário, baixa e previsão. | Forte | Incluir agenda de vida separada: reuniões, tarefas, afazeres e lembretes conectáveis ao financeiro. |
| Contas eletrônicas e pagamentos via Internet | Não existe pagamento real. | Lacuna moderna | Integrar Open Finance/pagamentos depois de segurança, consentimento, auditoria e provedor homologado. |
| Opção de ações de funcionário | Não existe. | Lacuna | Adicionar em Investimentos: stock options, vesting, strike, validade, exercício e impacto patrimonial. |
| Personalização de relatórios | Existe em `/reports`, com seções e filtros por período, conta, categoria e fluxo. | Bom | Salvar favoritos, presets e comparativos avançados. |
| Despesas do favorecido | Existe em `/reports?section=habits&report=payee-expenses`. | Coberto | Melhorar drill-down para lançamento original. |
| Despesas da categoria | Existe em `/reports?section=habits&report=category-expenses`. | Coberto | Melhorar subcategorias e tendência temporal. |
| Serviços financeiros via Web | Existe como intenção em Open Finance/importações, mas não como central completa. | Parcial | Criar Gerenciador de conexões: bancos, status, última sincronização, pendências e tarefas. |
| Gerenciador de serviços financeiros on-line | Não existe como tela consolidada. | Lacuna | Transformar `/web` em Hub de Conectividade com Open Finance, importadores, exportações e integrações. |
| Navegador da Web interno | O conceito antigo é datado para SaaS. | Substituir | Entregar favoritos financeiros, links seguros, integrações e webviews apenas quando houver valor real. |

## Decisão desta rodada

1. O alerta do Consultor financeiro deixou de ser apenas onboarding e passou a observar a rotina financeira.
2. A agenda de vida começou como camada visual separada da agenda financeira, evitando que tarefas sem valor contaminem a previsão de caixa.
3. As maiores lacunas deste bloco são: Centro de Decisões, Investimentos avançados, Hub de Conectividade e plano de ação automático do Perfil Pessoal.

## Próxima ordem sugerida

1. Finalizar plano de ação do Perfil Pessoal.
2. Reestruturar Centro de Decisões com simuladores reais.
3. Evoluir Investimentos com ativos, stock options e leitura de risco.
4. Transformar Web em Conectividade.
