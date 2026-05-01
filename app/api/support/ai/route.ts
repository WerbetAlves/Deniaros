import { NextResponse } from "next/server";
import { getSupportAiAdvice } from "@/lib/ai-support";
import {
  buildTicketDraft,
  normalizeSupportTopic
} from "@/lib/support";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Sessão expirada." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    question?: unknown;
    topic?: unknown;
  } | null;
  const question = String(body?.question ?? "").trim();
  const topic = normalizeSupportTopic(String(body?.topic ?? ""));

  if (question.length < 4) {
    return NextResponse.json(
      { error: "Escreva um pouco mais para a IA entender o contexto." },
      { status: 400 }
    );
  }

  const advice = await getSupportAiAdvice(topic, question);
  const ticketDraft = buildTicketDraft(topic, question, advice);

  return NextResponse.json({
    advice,
    ticketDraft
  });
}
