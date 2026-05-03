import type { SupabaseClient } from "@supabase/supabase-js";
import { getTicketDueAt, type TicketPriority } from "@/lib/support";

export type SupportNotificationKind =
  | "ticket_created"
  | "admin_replied"
  | "user_replied"
  | "status_changed"
  | "sla_warning"
  | "sla_breached";

export async function createSupportNotification(
  supabase: SupabaseClient,
  {
    body,
    kind,
    metadata = {},
    ticketId,
    title,
    userId,
    workspaceId
  }: {
    body: string;
    kind: SupportNotificationKind;
    metadata?: Record<string, unknown>;
    ticketId: string;
    title: string;
    userId: string | null | undefined;
    workspaceId: string | null | undefined;
  }
) {
  if (!userId) {
    return;
  }

  const { error } = await supabase.from("saas_support_notifications").insert({
    audience: "user",
    body,
    kind,
    metadata,
    ticket_id: ticketId,
    title,
    user_id: userId,
    workspace_id: workspaceId ?? null
  });

  if (error && error.code !== "42P01" && error.code !== "42703") {
    throw error;
  }
}

export async function markSupportNotificationsRead(
  supabase: SupabaseClient,
  userId: string,
  ticketId?: string
) {
  let query = supabase
    .from("saas_support_notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", userId)
    .is("read_at", null);

  if (ticketId) {
    query = query.eq("ticket_id", ticketId);
  }

  const { error } = await query;

  if (error && error.code !== "42P01" && error.code !== "42703") {
    throw error;
  }
}

export function buildSupportDueFields(fromIso: string, priority: TicketPriority) {
  const dueAt = getTicketDueAt(fromIso, priority);

  return {
    first_response_due_at: dueAt,
    next_response_due_at: dueAt
  };
}
