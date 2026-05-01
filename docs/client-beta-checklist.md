# Checklist para beta com clientes reais

Use este roteiro antes de liberar o Deniaros para alguém fora do ambiente de desenvolvimento.

## Antes do primeiro cliente

- Aplicar todas as migrations em `supabase/migrations`, da `0001` até a mais recente.
- Configurar `.env.local` no ambiente de produção, sem expor chaves no repositório.
- Rotacionar chaves que tenham aparecido em arquivos locais ou prints.
- Criar pelo menos um backup em `Configurações > Backup e restauração`.
- Validar login, cadastro, recuperação de senha e logout.
- Validar criação de carteira, lançamento, agenda financeira, relatório e planejador.
- Validar suporte/IA com uma pergunta real sobre dados financeiros.
- Rodar `npm run quality` antes do push.

## Fluxos mínimos para homologação

1. Criar usuário novo.
2. Preencher perfil financeiro pessoal.
3. Criar carteira física e conta principal.
4. Criar lançamento de entrada e saída.
5. Conferir movimento e comparar saldo da conta.
6. Criar conta a pagar e depósito futuro.
7. Abrir relatório de hábitos de consumo.
8. Abrir planejador e revisar orçamento.
9. Exportar backup JSON.
10. Abrir ticket de suporte.

## Pontos que ainda exigem cuidado

- Open Finance real depende de provedor e consentimento bancário.
- Stripe deve ser ligado somente após Vercel/GitHub estarem estáveis.
- Restauração automática de backup está bloqueada por segurança.
- Exclusão total de dados deve exigir confirmação dupla e auditoria.
- Testes E2E automatizados devem ser adicionados antes de escalar para muitos clientes.
