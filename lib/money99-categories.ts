import type { Category } from "@/lib/domain";

export type Money99CategoryNode = {
  name: string;
  group: string;
  children?: Array<{
    name: string;
    group: string;
  }>;
};

export const money99ExpenseCategories: Money99CategoryNode[] = [
  {
    name: "Alimentação",
    group: "Supermercado",
    children: [
      { name: "Restaurantes", group: "Restaurantes" },
      { name: "Supermercado", group: "Supermercado" }
    ]
  },
  {
    name: "Animal de estimação",
    group: "Outras despesas",
    children: [
      { name: "Alimentação", group: "Outras despesas" },
      { name: "Suprimentos", group: "Outras despesas" },
      { name: "Veterinário", group: "Outras despesas" }
    ]
  },
  {
    name: "Contas a pagar",
    group: "Outras contas a pagar",
    children: [
      { name: "Água e esgoto", group: "Conta água e esgoto" },
      { name: "Aluguel", group: "Conta aluguel" },
      { name: "Condomínio", group: "Outras contas a pagar" },
      { name: "Eletricidade", group: "Conta gás e eletricidade" },
      { name: "Gás", group: "Conta gás e eletricidade" },
      { name: "Juros financ. imobiliário", group: "Juros financ. imobiliário" },
      { name: "Lixo e reciclagem", group: "Conta lixo/reciclagem" },
      { name: "Telefone", group: "Conta telefone" },
      { name: "TV a cabo", group: "Conta TV a cabo" }
    ]
  },
  { name: "Despesas com filhos", group: "Despesas com filhos" },
  {
    name: "Despesas de trabalho",
    group: "Desp. trab. não reemb.",
    children: [
      { name: "Não-reembolsadas", group: "Desp. trab. não reemb." },
      { name: "Reembolsadas", group: "Desp. trab. reemb." }
    ]
  },
  { name: "Doações de caridade", group: "Doações de caridade" },
  {
    name: "Educação",
    group: "Educação",
    children: [
      { name: "Livros", group: "Educação" },
      { name: "Mensalidade escolar", group: "Educação" },
      { name: "Outros gastos", group: "Educação" }
    ]
  },
  {
    name: "Empréstimo",
    group: "Outros juros",
    children: [
      { name: "Empréstimo a Terceiros", group: "Retirada em dinheiro" },
      { name: "Empréstimo Consignado", group: "Outros juros" },
      { name: "Empréstimo entre Vocês", group: "Outros juros" },
      { name: "Financiamento Bancário", group: "Outros juros" },
      { name: "Juros do empréstimo", group: "Outros juros" },
      { name: "Pagamento de Empréstimo Pessoal", group: "Outros juros" },
      { name: "Refinanciamento", group: "Outros juros" },
      { name: "Taxas/Juros de Empréstimo", group: "Outros juros" }
    ]
  },
  {
    name: "Férias",
    group: "Lazer",
    children: [
      { name: "Acomodação", group: "Lazer" },
      { name: "Viagem", group: "Lazer" }
    ]
  },
  {
    name: "Higiene pessoal",
    group: "Outras despesas",
    children: [
      { name: "Cuidados com a Pele", group: "Outras despesas" },
      { name: "Cuidados com as Unhas", group: "Outras despesas" },
      { name: "Cuidados com o Cabelo", group: "Outras despesas" },
      { name: "Higiene Bucal", group: "Outras despesas" },
      { name: "Outros Itens de Higiene", group: "Outras despesas" },
      { name: "Perfumes & Desodorantes", group: "Outras despesas" },
      { name: "Produtos de Barbear/Depilação", group: "Outras despesas" },
      { name: "Produtos Íntimos", group: "Outras despesas" }
    ]
  },
  {
    name: "Impostos",
    group: "Pagos outros impostos",
    children: [
      { name: "Imposto de renda", group: "Impostos federais" },
      { name: "Imposto de renda - ano anterior", group: "Pagos outros impostos" },
      { name: "Impostos locais", group: "Pagos outros impostos" },
      { name: "Outros impostos", group: "Pagos outros impostos" }
    ]
  },
  {
    name: "Itens domésticos",
    group: "Despesas domésticas",
    children: [{ name: "Mobiliário", group: "Despesas domésticas" }]
  },
  {
    name: "Lazer",
    group: "Lazer",
    children: [
      { name: "Artigos esportivos", group: "Lazer" },
      { name: "Brinquedos e jogos", group: "Lazer" },
      { name: "Cinema e locação de vídeo", group: "Lazer" },
      { name: "Diversão", group: "Lazer" },
      { name: "Eventos culturais", group: "Lazer" },
      { name: "Eventos esportivos", group: "Lazer" },
      { name: "Fitas e CDs", group: "Lazer" },
      { name: "Livros e revistas", group: "Lazer" }
    ]
  },
  { name: "Miscelânea", group: "Outras despesas" },
  { name: "Presentes", group: "Outras despesas" },
  { name: "Retirada em dinheiro", group: "Retirada em dinheiro" },
  {
    name: "Saúde",
    group: "Despesas médico/dentárias",
    children: [
      { name: "Dentista", group: "Despesas médico/dentárias" },
      { name: "Hospital", group: "Despesas médico/dentárias" },
      { name: "Médico", group: "Despesas médico/dentárias" },
      { name: "Ótica", group: "Despesas médico/dentárias" },
      { name: "Remédios", group: "Despesas médico/dentárias" }
    ]
  },
  {
    name: "Seguro",
    group: "Seguro de vida",
    children: [
      { name: "Automóvel", group: "Seguro do automóvel" },
      { name: "Do locador/locatário", group: "Seguro da casa" },
      { name: "Saúde", group: "Despesas médico/dentárias" },
      { name: "Vida", group: "Seguro de vida" }
    ]
  },
  {
    name: "Taxas bancárias",
    group: "Taxas bancárias",
    children: [
      { name: "Juros pagos", group: "Taxas bancárias" },
      { name: "Taxa de serviço", group: "Taxas bancárias" }
    ]
  },
  {
    name: "Transporte",
    group: "Despesas com automóvel",
    children: [
      { name: "Bicicleta/Patins", group: "Despesas com automóvel" },
      { name: "Combustível", group: "Despesas com automóvel" },
      { name: "Estacionamento", group: "Despesas com automóvel" },
      { name: "Financiamento", group: "Despesas com automóvel" },
      { name: "IPVA/Licenciamento", group: "Despesas com automóvel" },
      { name: "Manutenção do veículo", group: "Despesas com automóvel" },
      { name: "Multas", group: "Despesas com automóvel" },
      { name: "Pedágio", group: "Despesas com automóvel" },
      { name: "Seguro do Veículo", group: "Despesas com automóvel" },
      { name: "Transporte Público", group: "Despesas com automóvel" },
      { name: "Viagens (Deslocamentos Longos)", group: "Despesas com automóvel" }
    ]
  },
  { name: "Vestuário", group: "Despesas com vestuário" }
];

export const money99IncomeCategories: Money99CategoryNode[] = [
  {
    name: "Empréstimos",
    group: "Outros rendimentos",
    children: [{ name: "Empréstimo a Terceiros", group: "Outros rendimentos" }]
  },
  {
    name: "Outros rendimentos",
    group: "Outros rendimentos",
    children: [
      { name: "Devolução de impostos", group: "Devolução de impostos" },
      { name: "Loterias", group: "Outros rendimentos" },
      { name: "Opção de ações de funcionário", group: "Outros rendimentos" },
      { name: "Pensão recebida para filho", group: "Pensão recebida para filho" },
      { name: "Presentes recebidos", group: "Presentes recebidos" },
      { name: "Principal do empréstimo recebido", group: "Rend. não-tributável" },
      { name: "Seguro desemprego", group: "Seguro desemprego" }
    ]
  },
  {
    name: "Rendimento de aposentadoria",
    group: "Outros rendimentos",
    children: [
      { name: "Benefícios do INSS", group: "Rend. previd. social" },
      { name: "Distribuições", group: "Rend. plano aposent./pensão" },
      { name: "Pensões e anuidades", group: "Rend. plano aposent./pensão" }
    ]
  },
  {
    name: "Rendimento de investimento",
    group: "Juros e dividendos",
    children: [
      { name: "Dividendos", group: "Juros e dividendos" },
      { name: "Ganhos de capital", group: "Juros e dividendos" },
      { name: "Juros", group: "Juros e dividendos" },
      { name: "Juros não-tributáveis", group: "Rend. não-tributável" }
    ]
  },
  {
    name: "Salários e ordenado",
    group: "Rend. salarial",
    children: [
      { name: "Bônus", group: "Rend. periódico" },
      { name: "Comissão", group: "Rend. periódico" },
      { name: "Contrib. empregador", group: "Contrib. empregador" },
      { name: "Horas extras", group: "Rend. periódico" },
      { name: "Pagamento bruto", group: "Rend. salarial" },
      { name: "Pagamento líquido", group: "Rend. salarial" },
      { name: "Pro-labore(retiradas)", group: "Rend. salarial" }
    ]
  }
];

export const money99CategoryTree = [
  { kind: "expense" as const, heading: "DESPESA", nodes: money99ExpenseCategories },
  { kind: "income" as const, heading: "RENDIMENTO", nodes: money99IncomeCategories }
];

export function getClassicCategoryGroup(category: Category, categories: Category[]) {
  const parentName = category.parentId
    ? categories.find((option) => option.id === category.parentId)?.name
    : undefined;

  for (const section of money99CategoryTree) {
    if (section.kind !== category.kind) {
      continue;
    }

    for (const node of section.nodes) {
      if (!parentName && node.name === category.name) {
        return node.group;
      }

      if (parentName === node.name) {
        const child = node.children?.find((option) => option.name === category.name);
        if (child) {
          return child.group;
        }
      }
    }
  }

  return parentName ?? (category.kind === "income" ? "Outros rendimentos" : "Outras despesas");
}
