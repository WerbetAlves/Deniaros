"use server";

import { redirect } from "next/navigation";
import {
  normalizeGoalPriority,
  normalizeGoalStatus,
  normalizeGoalType
} from "@/lib/money99-classic";
import { getWorkspaceContext } from "@/lib/workspace-context";

export async function createGoal(formData: FormData) {
  const { supabase, workspaceId } = await getWorkspaceContext();
  const title = String(formData.get("title") ?? "").trim();

  if (!title) {
    redirect("/planner?error=Informe o titulo da meta.");
  }

  const { error } = await supabase.from("financial_goals").insert({
    workspace_id: workspaceId,
    linked_account_id: normalizeOptionalId(formData.get("linkedAccountId")),
    title,
    goal_type: normalizeGoalType(formData.get("goalType")),
    priority: normalizeGoalPriority(formData.get("priority")),
    status: normalizeGoalStatus(formData.get("status")),
    target_amount: parseAmount(formData.get("targetAmount")),
    current_amount: parseAmount(formData.get("currentAmount")),
    target_date: normalizeOptionalDate(formData.get("targetDate")),
    notes: normalizeOptionalText(formData.get("notes"))
  });

  if (error) {
    redirect(`/planner?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/planner?success=Meta criada.");
}

export async function updateGoal(formData: FormData) {
  const { supabase, workspaceId } = await getWorkspaceContext();
  const itemId = String(formData.get("itemId") ?? "");
  const title = String(formData.get("title") ?? "").trim();

  if (!itemId || !title) {
    redirect("/planner?error=Preencha a meta antes de salvar.");
  }

  const { error } = await supabase
    .from("financial_goals")
    .update({
      linked_account_id: normalizeOptionalId(formData.get("linkedAccountId")),
      title,
      goal_type: normalizeGoalType(formData.get("goalType")),
      priority: normalizeGoalPriority(formData.get("priority")),
      status: normalizeGoalStatus(formData.get("status")),
      target_amount: parseAmount(formData.get("targetAmount")),
      current_amount: parseAmount(formData.get("currentAmount")),
      target_date: normalizeOptionalDate(formData.get("targetDate")),
      notes: normalizeOptionalText(formData.get("notes")),
      updated_at: new Date().toISOString()
    })
    .eq("id", itemId)
    .eq("workspace_id", workspaceId);

  if (error) {
    redirect(`/planner?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/planner?success=Meta atualizada.");
}

export async function deleteGoal(formData: FormData) {
  const { supabase, workspaceId } = await getWorkspaceContext();
  const itemId = String(formData.get("itemId") ?? "");

  if (!itemId) {
    redirect("/planner?error=Meta inválida para exclusão.");
  }

  const { error } = await supabase
    .from("financial_goals")
    .delete()
    .eq("id", itemId)
    .eq("workspace_id", workspaceId);

  if (error) {
    redirect(`/planner?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/planner?success=Meta removida.");
}

export async function createBudget(formData: FormData) {
  const { supabase, workspaceId } = await getWorkspaceContext();
  const categoryId = String(formData.get("categoryId") ?? "");
  const periodMonth = normalizePeriodMonth(formData.get("periodMonth"));

  if (!categoryId) {
    redirect(plannerRedirect("budget", "error", "Escolha a categoria do orçamento."));
  }

  const { error } = await supabase.from("category_budgets").insert({
    workspace_id: workspaceId,
    category_id: categoryId,
    period_month: periodMonth,
    monthly_limit: parseAmount(formData.get("monthlyLimit")),
    notes: normalizeOptionalText(formData.get("notes"))
  });

  if (error) {
    redirect(plannerRedirect("budget", "error", error.message));
  }

  redirect(plannerRedirect("budget", "success", "Orçamento salvo."));
}

export async function updateBudget(formData: FormData) {
  const { supabase, workspaceId } = await getWorkspaceContext();
  const itemId = String(formData.get("itemId") ?? "");
  const categoryId = String(formData.get("categoryId") ?? "");
  const periodMonth = normalizePeriodMonth(formData.get("periodMonth"));

  if (!itemId || !categoryId) {
    redirect(plannerRedirect("budget", "error", "Preencha o orçamento antes de salvar."));
  }

  const { error } = await supabase
    .from("category_budgets")
    .update({
      category_id: categoryId,
      period_month: periodMonth,
      monthly_limit: parseAmount(formData.get("monthlyLimit")),
      notes: normalizeOptionalText(formData.get("notes")),
      updated_at: new Date().toISOString()
    })
    .eq("id", itemId)
    .eq("workspace_id", workspaceId);

  if (error) {
    redirect(plannerRedirect("budget", "error", error.message));
  }

  redirect(plannerRedirect("budget", "success", "Orçamento atualizado."));
}

export async function deleteBudget(formData: FormData) {
  const { supabase, workspaceId } = await getWorkspaceContext();
  const itemId = String(formData.get("itemId") ?? "");

  if (!itemId) {
    redirect(plannerRedirect("budget", "error", "Orçamento inválido para exclusão."));
  }

  const { error } = await supabase
    .from("category_budgets")
    .delete()
    .eq("id", itemId)
    .eq("workspace_id", workspaceId);

  if (error) {
    redirect(plannerRedirect("budget", "error", error.message));
  }

  redirect(plannerRedirect("budget", "success", "Orçamento removido."));
}

export async function createDebtReductionDebt(formData: FormData) {
  const { supabase, workspaceId } = await getWorkspaceContext();
  const name = String(formData.get("name") ?? "").trim();

  if (!name) {
    redirect(plannerRedirect("debts", "error", "Informe o nome da dívida."));
  }

  const { error } = await supabase.from("debt_reduction_debts").insert({
    workspace_id: workspaceId,
    linked_account_id: normalizeOptionalId(formData.get("linkedAccountId")),
    name,
    balance: parseAmount(formData.get("balance")),
    annual_interest_rate: parseRate(formData.get("annualInterestRate")),
    minimum_payment: parseAmount(formData.get("minimumPayment")),
    planned_payment: parseAmount(formData.get("plannedPayment")),
    credit_limit: parseAmount(formData.get("creditLimit")),
    due_day: normalizeDueDay(formData.get("dueDay")),
    included_in_plan: formData.get("includedInPlan") !== "off",
    notes: normalizeOptionalText(formData.get("notes"))
  });

  if (error) {
    redirect(plannerRedirect("debts", "error", error.message));
  }

  redirect(plannerRedirect("debts", "success", "Dívida adicionada ao planejador."));
}

export async function updateDebtReductionDebt(formData: FormData) {
  const { supabase, workspaceId } = await getWorkspaceContext();
  const itemId = String(formData.get("itemId") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();

  if (!itemId || !name) {
    redirect(plannerRedirect("debts", "error", "Preencha a dívida antes de salvar."));
  }

  const { error } = await supabase
    .from("debt_reduction_debts")
    .update({
      linked_account_id: normalizeOptionalId(formData.get("linkedAccountId")),
      name,
      balance: parseAmount(formData.get("balance")),
      annual_interest_rate: parseRate(formData.get("annualInterestRate")),
      minimum_payment: parseAmount(formData.get("minimumPayment")),
      planned_payment: parseAmount(formData.get("plannedPayment")),
      credit_limit: parseAmount(formData.get("creditLimit")),
      due_day: normalizeDueDay(formData.get("dueDay")),
      included_in_plan: formData.get("includedInPlan") !== "off",
      notes: normalizeOptionalText(formData.get("notes")),
      updated_at: new Date().toISOString()
    })
    .eq("id", itemId)
    .eq("workspace_id", workspaceId);

  if (error) {
    redirect(plannerRedirect("debts", "error", error.message));
  }

  redirect(plannerRedirect("debts", "success", "Dívida atualizada."));
}

export async function deleteDebtReductionDebt(formData: FormData) {
  const { supabase, workspaceId } = await getWorkspaceContext();
  const itemId = String(formData.get("itemId") ?? "").trim();

  if (!itemId) {
    redirect(plannerRedirect("debts", "error", "Dívida inválida para exclusão."));
  }

  const { error } = await supabase
    .from("debt_reduction_debts")
    .delete()
    .eq("id", itemId)
    .eq("workspace_id", workspaceId);

  if (error) {
    redirect(plannerRedirect("debts", "error", error.message));
  }

  redirect(plannerRedirect("debts", "success", "Dívida removida do planejador."));
}

function plannerRedirect(view: "debts" | "budget", type: "error" | "success", message: string) {
  return `/planner?view=${view}&${type}=${encodeURIComponent(message)}`;
}

function parseAmount(value: FormDataEntryValue | null) {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? Math.abs(number) : 0;
}

function parseRate(value: FormDataEntryValue | null) {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? Math.max(0, number) : 0;
}

function normalizeDueDay(value: FormDataEntryValue | null) {
  const number = Number(value ?? 0);

  if (!Number.isInteger(number) || number < 1 || number > 31) {
    return null;
  }

  return number;
}

function normalizeOptionalText(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  return text || null;
}

function normalizeOptionalId(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  return text && text !== "none" ? text : null;
}

function normalizeOptionalDate(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : null;
}

function normalizePeriodMonth(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();

  if (/^\d{4}-\d{2}$/.test(text)) {
    return `${text}-01`;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    return `${text.slice(0, 7)}-01`;
  }

  const now = new Date();
  const year = now.getFullYear();
  const month = `${now.getMonth() + 1}`.padStart(2, "0");
  return `${year}-${month}-01`;
}
