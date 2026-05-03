import assert from "node:assert/strict";
import test from "node:test";
import { getFinancialAssistantReply } from "../lib/financial-assistant.ts";

test("consultor IA tenta modelo alternativo quando Gemini retorna 400", async (t) => {
  const originalFetch = globalThis.fetch;
  const originalApiKey = process.env.GEMINI_API_KEY;
  const originalModel = process.env.GEMINI_TEXT_MODEL;
  const calls: string[] = [];

  t.after(() => {
    globalThis.fetch = originalFetch;
    process.env.GEMINI_API_KEY = originalApiKey;
    process.env.GEMINI_TEXT_MODEL = originalModel;
  });

  process.env.GEMINI_API_KEY = "test-key";
  process.env.GEMINI_TEXT_MODEL = "modelo-invalido";

  globalThis.fetch = async (input: string | URL | Request) => {
    const url = String(input);
    calls.push(url);

    if (url.includes("modelo-invalido")) {
      return new Response(JSON.stringify({ error: { message: "model not found" } }), {
        status: 400
      });
    }

    return new Response(
      JSON.stringify({
        candidates: [
          {
            content: {
              parts: [{ text: "Resposta com contexto real." }]
            }
          }
        ]
      }),
      { status: 200 }
    );
  };

  const reply = await getFinancialAssistantReply({
    allowFinancialContext: true,
    data: {
      accounts: [],
      categories: [],
      payees: [],
      scheduledItems: [],
      source: "supabase",
      transactions: [],
      workspace: {
        baseCurrency: "BRL",
        countryCode: "BR",
        id: "workspace-1",
        locale: "pt-BR",
        name: "Meu Deniaros",
        timeZone: "America/Fortaleza",
        type: "personal"
      }
    },
    history: [],
    message: "Como esta meu caixa?"
  });

  assert.equal(reply.source, "gemini");
  assert.equal(reply.answer, "Resposta com contexto real.");
  assert.equal(calls.length, 2);
  assert.match(calls[0] ?? "", /modelo-invalido/);
  assert.match(calls[1] ?? "", /gemini-2\.5-flash/);
});
