"use server";

import { redirect } from "next/navigation";
import type { TicketArea, TicketPriority } from "@/lib/support";
import { buildSupportDueFields, createSupportNotification } from "@/lib/support-operations";
import { getWorkspaceContext } from "@/lib/workspace-context";

const supportPath = "/support";

export async function createSupportTicket(formData: FormData) {
  const { supabase, user, workspaceId } = await getWorkspaceContext();

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const aiContext = String(formData.get("aiContext") ?? "").trim();
  const area = normalizeTicketArea(formData.get("area"));
  const priority = normalizeTicketPriority(formData.get("priority"));
  const now = new Date().toISOString();

  if (title.length < 6) {
    redirect(`${supportPath}?error=${encodeURIComponent("Informe um assunto com mais detalhes.")}#ticket-form`);
  }

  if (description.length < 20) {
    redirect(
      `${supportPath}?error=${encodeURIComponent("Descreva o que aconteceu com pelo menos 20 caracteres.")}#ticket-form`
    );
  }

  const { data: ticket, error } = await supabase
    .from("saas_support_tickets")
    .insert({
      area,
      description: aiContext ? `${description}\n\n---\n${aiContext}` : description,
      priority,
      requester_email: user.email ?? null,
      requester_id: user.id,
      status: "open",
      title,
      workspace_id: workspaceId,
      ...buildSupportDueFields(now, priority)
    })
    .select("id,workspace_id,first_response_due_at")
    .maybeSingle<{
      first_response_due_at: string | null;
      id: string;
      workspace_id: string | null;
    }>();

  if (error) {
    redirect(`${supportPath}?error=${encodeURIComponent(error.message)}#ticket-form`);
  }

  if (ticket) {
    await createSupportNotification(supabase, {
      body: `Seu ticket entrou na fila. Primeira resposta prevista: ${formatDateTime(
        ticket.first_response_due_at
      )}.`,
      kind: "ticket_created",
      metadata: {
        firstResponseDueAt: ticket.first_response_due_at,
        priority
      },
      ticketId: ticket.id,
      title: "Ticket aberto",
      userId: user.id,
      workspaceId: ticket.workspace_id
    });
  }

  redirect(`${supportPath}?success=${encodeURIComponent("Ticket aberto. Nossa fila já recebeu o contexto.")}`);
}

export async function createUserSupportTicketMessage(formData: FormData) {
  const { supabase, user } = await getWorkspaceContext();
  const ticketId = String(formData.get("ticketId") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const returnTo = normalizeSupportReturnTo(formData.get("returnTo"), ticketId);

  if (!ticketId) {
    redirect(`${supportPath}?error=${encodeURIComponent("Ticket inválido.")}`);
  }

  if (body.length < 2) {
    redirect(`${returnTo}?error=${encodeURIComponent("Escreva uma mensagem antes de enviar.")}`);
  }

  const { data: ticket, error: ticketError } = await supabase
    .from("saas_support_tickets")
    .select("id,workspace_id,status,requester_id,priority")
    .eq("id", ticketId)
    .eq("requester_id", user.id)
    .maybeSingle<{
      id: string;
      priority: TicketPriority;
      requester_id: string | null;
      status: "open" | "in_progress" | "waiting" | "resolved" | "closed";
      workspace_id: string | null;
    }>();

  if (ticketError || !ticket) {
    redirect(`${supportPath}?error=${encodeURIComponent(ticketError?.message ?? "Ticket não encontrado.")}`);
  }

  if (ticket.status === "resolved" || ticket.status === "closed") {
    redirect(
      `${returnTo}?error=${encodeURIComponent(
        "Este ticket já foi finalizado. Abra um novo atendimento se precisar continuar."
      )}`
    );
  }

  const { error } = await supabase.from("saas_support_ticket_messages").insert({
    author_id: user.id,
    author_role: "user",
    body,
    ticket_id: ticket.id,
    visibility: "public",
    workspace_id: ticket.workspace_id
  });

  if (error) {
    redirect(`${returnTo}?error=${encodeURIComponent(error.message)}`);
  }

  await supabase
    .from("saas_support_tickets")
    .update({
      next_response_due_at: buildSupportDueFields(new Date().toISOString(), ticket.priority).next_response_due_at,
      status: "open",
      status_reason: "Usuario adicionou nova mensagem ao ticket.",
      updated_at: new Date().toISOString()
    })
    .eq("id", ticket.id)
    .eq("requester_id", user.id);

  await createSupportNotification(supabase, {
    body: "Sua mensagem foi anexada ao histórico. O ticket voltou para a fila do suporte.",
    kind: "user_replied",
    metadata: {
      ticketStatus: "open"
    },
    ticketId: ticket.id,
    title: "Mensagem enviada",
    userId: user.id,
    workspaceId: ticket.workspace_id
  });

  redirect(`${returnTo}?success=${encodeURIComponent("Mensagem enviada ao suporte.")}`);
}

function normalizeTicketArea(value: FormDataEntryValue | null): TicketArea {
  const raw = String(value ?? "technical");
  if (raw === "feature" || raw === "billing" || raw === "guidance" || raw === "account") {
    return raw;
  }
  return "technical";
}

function normalizeTicketPriority(value: FormDataEntryValue | null): TicketPriority {
  const raw = String(value ?? "medium");
  if (raw === "low" || raw === "high" || raw === "urgent") {
    return raw;
  }
  return "medium";
}

function formatDateTime(value: string | null) {
  if (!value) {
    return "em breve";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(new Date(value));
}

function normalizeSupportReturnTo(value: FormDataEntryValue | null, ticketId: string) {
  const raw = String(value ?? "").trim();
  if (raw.startsWith("/support/tickets/")) {
    return raw;
  }
  return ticketId ? `${supportPath}/tickets/${ticketId}` : supportPath;
}
