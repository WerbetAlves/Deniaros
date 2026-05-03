import assert from "node:assert/strict";
import test from "node:test";
import {
  buildTicketDraft,
  getSupportResponseSuggestions,
  getTicketDueAt,
  getTicketOperationalNextStep,
  getTicketSla,
  getTriageAdvice,
  normalizeSupportTopic,
  normalizeTicketStatus,
  parseSupportDescription,
  sortTicketsByAttention
} from "../lib/support.ts";

test("normaliza filtros de suporte para valores seguros", () => {
  assert.equal(normalizeTicketStatus("waiting"), "waiting");
  assert.equal(normalizeTicketStatus("qualquer"), "all");
  assert.equal(normalizeSupportTopic("billing"), "billing");
  assert.equal(normalizeSupportTopic("desconhecido"), "launch");
});

test("calcula SLA por prioridade e estado do ticket", () => {
  const now = new Date("2026-05-03T12:00:00Z");

  assert.equal(getTicketDueAt("2026-05-03T08:00:00Z", "urgent"), "2026-05-03T12:00:00.000Z");
  assert.deepEqual(
    getTicketSla(
      {
        area: "technical",
        created_at: "2026-05-03T08:00:00Z",
        priority: "urgent",
        status: "open",
        updated_at: "2026-05-03T08:10:00Z"
      },
      now
    ),
    {
      className: "sla-overdue",
      label: "SLA vencido",
      meta: "Responder agora · meta 4h",
      remainingHours: 0,
      targetHours: 4
    }
  );

  assert.equal(
    getTicketSla(
      {
        area: "billing",
        created_at: "2026-05-03T08:00:00Z",
        priority: "low",
        status: "waiting",
        updated_at: "2026-05-03T08:10:00Z"
      },
      now
    ).className,
    "sla-waiting"
  );
});

test("ordena tickets por atencao operacional", () => {
  const tickets = sortTicketsByAttention([
    {
      area: "billing",
      created_at: "2026-05-03T10:00:00Z",
      id: "low",
      priority: "low",
      status: "open",
      updated_at: "2026-05-03T10:00:00Z"
    },
    {
      area: "technical",
      created_at: "2026-05-01T10:00:00Z",
      id: "urgent-overdue",
      priority: "urgent",
      status: "open",
      updated_at: "2026-05-01T10:00:00Z"
    },
    {
      area: "feature",
      created_at: "2026-05-03T11:00:00Z",
      id: "high",
      priority: "high",
      status: "open",
      updated_at: "2026-05-03T11:00:00Z"
    }
  ]);

  assert.equal(tickets[0]?.id, "urgent-overdue");
  assert.equal(tickets[1]?.id, "high");
});

test("gera triagem e rascunho de ticket com contexto aproveitavel", () => {
  const advice = getTriageAdvice("reports", "Meu grafico nao bate com a categoria mercado");
  const draft = buildTicketDraft("reports", "Meu grafico nao bate com a categoria mercado", advice);

  assert.equal(draft.area, "guidance");
  assert.equal(advice.href, "/reports");
  assert.match(draft.context, /Meu grafico nao bate/);
  assert.match(draft.description, /O que eu preciso resolver/);
  assert.equal(getSupportResponseSuggestions("billing").length, 2);
  assert.equal(getTicketOperationalNextStep({ ...minimalTicket(), status: "open" }), "Precisa de primeira resposta do suporte.");
});

test("separa mensagem do usuario e contexto tecnico do suporte", () => {
  assert.deepEqual(parseSupportDescription("Preciso de ajuda\n---\nTela: Agenda"), {
    context: "Tela: Agenda",
    message: "Preciso de ajuda"
  });
});

function minimalTicket() {
  return {
    area: "technical",
    created_at: "2026-05-03T08:00:00Z",
    priority: "medium" as const,
    updated_at: "2026-05-03T08:00:00Z"
  };
}
