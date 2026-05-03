import { NextResponse } from "next/server";
import { getFinancialAssistantReply } from "@/lib/financial-assistant";
import { getFinancialData, type FinancialData } from "@/lib/financial-data";
import { getPrivacyPreferences, recordDataAccessEvent } from "@/lib/privacy";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ensureDefaultWorkspace } from "@/lib/workspace-bootstrap";

export const runtime = "nodejs";

type ChatMessage = {
  role: "assistant" | "user";
  content: string;
};

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Sessão expirada." }, { status: 401 });
  }

  const workspaceId = await ensureDefaultWorkspace(supabase, user);
  const privacyPreferences = await getPrivacyPreferences(supabase, user.id, workspaceId);
  const body = (await request.json().catch(() => null)) as {
    allowFinancialContext?: unknown;
    history?: unknown;
    message?: unknown;
  } | null;
  const message = String(body?.message ?? "").trim();

  if (message.length < 2) {
    return NextResponse.json(
      { error: "Escreva uma mensagem para o Consultor IA." },
      { status: 400 }
    );
  }

  const requestedFinancialContext = body?.allowFinancialContext === true;
  const effectiveFinancialContext =
    requestedFinancialContext && privacyPreferences.allowAiFinancialContext;
  const data = effectiveFinancialContext
    ? await getFinancialData({
        supabase,
        user,
        workspaceId
      })
    : buildPrivacyRestrictedFinancialData(workspaceId);

  if (effectiveFinancialContext) {
    await recordDataAccessEvent(supabase, {
      accessReason: "Contexto financeiro enviado ao Consultor IA por consentimento do usuario.",
      accessScope: "financial_context_ai",
      metadata: {
        messageLength: message.length
      },
      user,
      workspaceId
    });
  }

  const reply = await getFinancialAssistantReply({
    allowFinancialContext: effectiveFinancialContext,
    data,
    history: normalizeHistory(body?.history),
    message
  });

  return NextResponse.json({
    answer: reply.answer,
    assistantSource: reply.source,
    contextSource: data.source,
    fallbackReason: reply.fallbackReason,
    usedFinancialContext: effectiveFinancialContext
  });
}

function buildPrivacyRestrictedFinancialData(workspaceId: string): FinancialData {
  return {
    accounts: [],
    categories: [],
    payees: [],
    scheduledItems: [],
    source: "unavailable",
    transactions: [],
    workspace: {
      baseCurrency: "BRL",
      countryCode: "BR",
      id: workspaceId,
      locale: "pt-BR",
      name: "Meu Deniaros",
      timeZone: "America/Fortaleza",
      type: "personal"
    }
  };
}

function normalizeHistory(value: unknown): ChatMessage[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const role = "role" in item ? item.role : undefined;
      const content = "content" in item ? item.content : undefined;

      if ((role !== "assistant" && role !== "user") || typeof content !== "string") {
        return null;
      }

      return {
        content: content.trim().slice(0, 1200),
        role
      };
    })
    .filter((item): item is ChatMessage => Boolean(item && item.content))
    .slice(-8);
}
