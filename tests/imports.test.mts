import assert from "node:assert/strict";
import test from "node:test";
import {
  buildTransactionSignature,
  detectImportSourceType,
  findImportDuplicate,
  parseImportCsv,
  parseImportStatement
} from "../lib/imports.ts";

test("detecta duplicado importado por assinatura exata", () => {
  const row = {
    amount: -118.4,
    date: "2026-04-24",
    description: "Pagamento da energia"
  };
  const signature = buildTransactionSignature({
    accountId: "checking",
    amount: row.amount,
    date: row.date,
    description: row.description
  });

  const duplicate = findImportDuplicate({
    accountId: "checking",
    row,
    signature,
    transactions: [
      {
        accountId: "checking",
        amount: -118.4,
        date: "2026-04-24",
        description: "Pagamento da energia",
        importSignature: signature
      }
    ]
  });

  assert.equal(duplicate?.reason, "signature");
});

test("detecta possivel duplicado manual por data valor e descricao parecida", () => {
  const row = {
    amount: -118.4,
    date: "2026-04-24",
    description: "Pagamento energia"
  };
  const signature = buildTransactionSignature({
    accountId: "checking",
    amount: row.amount,
    date: row.date,
    description: row.description
  });

  const duplicate = findImportDuplicate({
    accountId: "checking",
    row,
    signature,
    transactions: [
      {
        accountId: "checking",
        amount: -118.4,
        date: "2026-04-24",
        description: "Pagamento da energia eletrica"
      }
    ]
  });

  assert.equal(duplicate?.reason, "same_day_amount_description");
});

test("nao marca como duplicado quando valor ou conta mudam", () => {
  const row = {
    amount: -118.4,
    date: "2026-04-24",
    description: "Pagamento energia"
  };
  const signature = buildTransactionSignature({
    accountId: "checking",
    amount: row.amount,
    date: row.date,
    description: row.description
  });

  const duplicate = findImportDuplicate({
    accountId: "checking",
    row,
    signature,
    transactions: [
      {
        accountId: "cash",
        amount: -118.4,
        date: "2026-04-24",
        description: "Pagamento energia"
      },
      {
        accountId: "checking",
        amount: -119.4,
        date: "2026-04-24",
        description: "Pagamento energia"
      }
    ]
  });

  assert.equal(duplicate, null);
});

test("interpreta csv com virgula decimal e tipo de despesa", () => {
  const rows = parseImportCsv(
    "data;descricao;valor;tipo\n24/04/2026;Pagamento energia;R$ 118,40;despesa"
  );

  assert.deepEqual(rows, [
    {
      amount: -118.4,
      categoryName: undefined,
      date: "2026-04-24",
      description: "Pagamento energia",
      payeeName: undefined,
      subcategoryName: undefined
    }
  ]);
});

test("detecta e interpreta qif legado exportado de outro sistema", () => {
  const qif = `!Type:Bank
D4/24'26
TP-118.40
PConta de energia
MMedidor 145
LMoradia:Utilidades
^
D4/25'26
T1220.00
PUber
LRenda
^`;

  assert.equal(detectImportSourceType(qif), "qif");
  assert.deepEqual(parseImportStatement(qif), [
    {
      amount: -118.4,
      categoryName: "Moradia",
      date: "2026-04-24",
      description: "Conta de energia",
      payeeName: "Conta de energia",
      subcategoryName: "Utilidades"
    },
    {
      amount: 1220,
      categoryName: "Renda",
      date: "2026-04-25",
      description: "Uber",
      payeeName: "Uber",
      subcategoryName: undefined
    }
  ]);
});
