export type WorkspaceMaturity =
  | "workspace_empty"
  | "workspace_initialized"
  | "workspace_active"
  | "workspace_ready_for_insights";

export type WorkspaceMaturityInput = {
  accountCount: number;
  transactionCount: number;
  scheduledCount?: number;
};

export function getWorkspaceMaturity({
  accountCount,
  transactionCount,
  scheduledCount = 0
}: WorkspaceMaturityInput): WorkspaceMaturity {
  if (accountCount <= 0) {
    return "workspace_empty";
  }

  if (transactionCount <= 0) {
    return "workspace_initialized";
  }

  if (transactionCount >= 8 || (transactionCount >= 5 && scheduledCount >= 2)) {
    return "workspace_ready_for_insights";
  }

  return "workspace_active";
}

export function canShowAdvancedInsights(maturity: WorkspaceMaturity) {
  return maturity === "workspace_ready_for_insights";
}
