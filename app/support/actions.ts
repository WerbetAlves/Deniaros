"use server";

import { redirect } from "next/navigation";
import { getWorkspaceContext } from "@/lib/workspace-context";

const supportPath = "/support";

export async function createSupportTicket(formData: FormData) {
  const { supabase, user, workspaceId } = await getWorkspaceContext();

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const aiContext = String(formData.get("aiContext") ?? "").trim();
  const area = normalizeTicketArea(formData.get("area"));
  const priority = normalizeTicketPriority(formData.get("priority"));

  if (title.length < 6) {
    redirect(`${supportPath}?error=${encodeURIComponent("Informe um assunto com mais detalhes.")}#ticket-form`);
  }

  if (description.length < 20) {
    redirect(
      `${supportPath}?error=${encodeURIComponent("Descreva o que aconteceu com pelo menos 20 caracteres.")}#ticket-form`
    );
  }

  const { error } = await supabase.from("saas_support_tickets").insert({
    area,
    description: aiContext ? `${description}\n\n---\n${aiContext}` : description,
    priority,
    requester_email: user.email ?? null,
    requester_id: user.id,
    status: "open",
    title,
    workspace_id: workspaceId
  });

  if (error) {
    redirect(`${supportPath}?error=${encodeURIComponent(error.message)}#ticket-form`);
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
    .select("id,workspace_id,status,requester_id")
    .eq("id", ticketId)
    .eq("requester_id", user.id)
    .maybeSingle<{
      id: string;
      requester_id: string | null;
      status: "open" | "waiting" | "resolved" | "closed";
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
      status: "open",
      updated_at: new Date().toISOString()
    })
    .eq("id", ticket.id)
    .eq("requester_id", user.id);

  redirect(`${returnTo}?success=${encodeURIComponent("Mensagem enviada ao suporte.")}`);
}

function normalizeTicketArea(value: FormDataEntryValue | null) {
  const raw = String(value ?? "technical");
  return ["technical", "feature", "billing", "guidance", "account"].includes(raw)
    ? raw
    : "technical";
}

function normalizeTicketPriority(value: FormDataEntryValue | null) {
  const raw = String(value ?? "medium");
  return ["low", "medium", "high", "urgent"].includes(raw) ? raw : "medium";
}

function normalizeSupportReturnTo(value: FormDataEntryValue | null, ticketId: string) {
  const raw = String(value ?? "").trim();
  if (raw.startsWith("/support/tickets/")) {
    return raw;
  }
  return ticketId ? `${supportPath}/tickets/${ticketId}` : supportPath;
}
