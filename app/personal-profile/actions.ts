"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  getDefaultPersonalProfileClassicAnswers,
  type PersonalProfileClassicAnswers
} from "@/lib/money99-classic";
import { getWorkspaceContext } from "@/lib/workspace-context";

const profileOnboardingCookie = "deniaros-profile-onboarding-ready";
const profileOnboardingSkipCookie = "deniaros-profile-onboarding-skipped";

export async function savePersonalProfile(formData: FormData) {
  const { supabase, user, workspaceId } = await getWorkspaceContext();
  const cookieStore = await cookies();
  const nextPath = normalizeNextPath(String(formData.get("nextPath") ?? ""));
  const hasNoChildren = hasCheckbox(formData, "childrenNone");

  const classicAnswers: PersonalProfileClassicAnswers = {
    firstName: normalizeText(formData.get("firstName")),
    lastName: normalizeText(formData.get("lastName")),
    birthDate: normalizeDateInput(formData.get("birthDate")),
    financesScope:
      String(formData.get("financesScope") ?? "") === "self_and_spouse"
        ? "self_and_spouse"
        : "self",
    spouseFirstName: normalizeText(formData.get("spouseFirstName")),
    spouseLastName: normalizeText(formData.get("spouseLastName")),
    spouseBirthDate: normalizeDateInput(formData.get("spouseBirthDate")),
    maritalStatus:
      String(formData.get("maritalStatus") ?? "") === "married"
        ? "married"
        : "not_married",
    housing: {
      rent: hasCheckbox(formData, "housingRent"),
      ownHome: hasCheckbox(formData, "housingOwnHome"),
      planBuyHome: hasCheckbox(formData, "housingPlanBuyHome")
    },
    usesCreditCard: parseYesNo(formData.get("usesCreditCard"), true),
    childrenAgeGroups: {
      none: hasNoChildren,
      under10: hasNoChildren ? false : hasCheckbox(formData, "childrenUnder10"),
      between11And17: hasNoChildren ? false : hasCheckbox(formData, "childrenBetween11And17"),
      over18: hasNoChildren ? false : hasCheckbox(formData, "childrenOver18")
    },
    supportsAdult: parseYesNo(formData.get("supportsAdult"), false),
    hasInvestments: parseYesNo(formData.get("hasInvestments"), false),
    hasRetirementPlan: parseYesNo(formData.get("hasRetirementPlan"), false),
    wantsExpenseMonitoring: parseYesNo(formData.get("wantsExpenseMonitoring"), true),
    wantsFinanceNews: parseYesNo(formData.get("wantsFinanceNews"), false),
    featureInterests: {
      monitorBalances: hasCheckbox(formData, "featureMonitorBalances"),
      payBills: hasCheckbox(formData, "featurePayBills"),
      investmentNews: hasCheckbox(formData, "featureInvestmentNews"),
      stockQuotes: hasCheckbox(formData, "featureStockQuotes"),
      taxInfo: hasCheckbox(formData, "featureTaxInfo")
    },
    isSelfEmployed: parseYesNo(formData.get("isSelfEmployed"), false)
  };

  const birthYear = extractYear(classicAnswers.birthDate);
  const dependents = getDependentsSignal(classicAnswers);
  const notes = buildClassicProfileNotes(classicAnswers);

  const { error } = await supabase.from("personal_profiles").upsert(
    {
      workspace_id: workspaceId,
      classic_answers: classicAnswers,
      marital_status: classicAnswers.maritalStatus === "married" ? "married" : "single",
      birth_year: birthYear,
      dependents,
      notes: notes || null,
      updated_at: new Date().toISOString()
    },
    {
      onConflict: "workspace_id"
    }
  );

  if (error) {
    if (error.code === "42703") {
      redirect(
        "/personal-profile?error=Ative%20a%20migration%200007_personal_profile_classic_questionnaire.sql%20para%20usar%20o%20questionário%20Money99."
      );
    }

    redirect(`/personal-profile?error=${encodeURIComponent(error.message)}`);
  }

  cookieStore.set(profileOnboardingCookie, user.id, {
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 180,
    path: "/",
    sameSite: "lax"
  });
  cookieStore.delete(profileOnboardingSkipCookie);

  if (nextPath) {
    redirect(nextPath);
  }

  redirect("/personal-profile?success=Perguntas do perfil pessoal salvas.");
}

export async function skipPersonalProfileOnboarding(formData: FormData) {
  const { user } = await getWorkspaceContext();
  const cookieStore = await cookies();
  const nextPath = normalizeNextPath(String(formData.get("nextPath") ?? ""));

  cookieStore.set(profileOnboardingSkipCookie, user.id, {
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 180,
    path: "/",
    sameSite: "lax"
  });

  redirect(nextPath ?? "/");
}

export async function resetPersonalProfile() {
  const { supabase, workspaceId } = await getWorkspaceContext();

  const { error } = await supabase.from("personal_profiles").upsert(
    {
      workspace_id: workspaceId,
      classic_answers: getDefaultPersonalProfileClassicAnswers(),
      marital_status: "single",
      birth_year: null,
      dependents: 0,
      notes: null,
      updated_at: new Date().toISOString()
    },
    {
      onConflict: "workspace_id"
    }
  );

  if (error) {
    if (error.code === "42703") {
      redirect(
        "/personal-profile?error=Ative%20a%20migration%200007_personal_profile_classic_questionnaire.sql%20para%20usar%20o%20questionário%20Money99."
      );
    }

    redirect(`/personal-profile?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/personal-profile?success=Perguntas redefinidas. Você pode responder novamente.");
}

function hasCheckbox(formData: FormData, name: string) {
  return formData.get(name) === "on";
}

function parseYesNo(value: FormDataEntryValue | null, fallback: boolean) {
  const raw = String(value ?? "").trim().toLowerCase();

  if (raw === "yes") {
    return true;
  }

  if (raw === "no") {
    return false;
  }

  return fallback;
}

function normalizeText(value: FormDataEntryValue | null) {
  return String(value ?? "").trim();
}

function normalizeDateInput(value: FormDataEntryValue | null) {
  const raw = String(value ?? "").trim();

  if (!raw) {
    return "";
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return "";
  }

  return raw;
}

function extractYear(dateIso: string) {
  if (!dateIso) {
    return null;
  }

  const year = Number.parseInt(dateIso.slice(0, 4), 10);
  return Number.isFinite(year) ? year : null;
}

function getDependentsSignal(answers: {
  childrenAgeGroups: {
    none: boolean;
    under10: boolean;
    between11And17: boolean;
    over18: boolean;
  };
  supportsAdult: boolean;
}) {
  if (answers.childrenAgeGroups.none) {
    return answers.supportsAdult ? 1 : 0;
  }

  let total = 0;

  if (answers.childrenAgeGroups.under10) {
    total += 1;
  }

  if (answers.childrenAgeGroups.between11And17) {
    total += 1;
  }

  if (answers.childrenAgeGroups.over18) {
    total += 1;
  }

  if (answers.supportsAdult) {
    total += 1;
  }

  return total;
}

function buildClassicProfileNotes(answers: {
  financesScope: "self" | "self_and_spouse";
  maritalStatus: "married" | "not_married";
  hasInvestments: boolean;
  hasRetirementPlan: boolean;
  wantsExpenseMonitoring: boolean;
  isSelfEmployed: boolean;
}) {
  const tags: string[] = [];

  tags.push(answers.financesScope === "self_and_spouse" ? "escopo_famíliar" : "escopo_individual");
  tags.push(answers.maritalStatus === "married" ? "casado" : "não_casado");

  if (answers.hasInvestments) {
    tags.push("investidor");
  }

  if (answers.hasRetirementPlan) {
    tags.push("aposentadoria_ativa");
  }

  if (answers.wantsExpenseMonitoring) {
    tags.push("foco_controle_gastos");
  }

  if (answers.isSelfEmployed) {
    tags.push("autonomo");
  }

  return tags.join(", ");
}

function normalizeNextPath(value: string) {
  const path = value.trim();

  if (!path || !path.startsWith("/") || path.startsWith("//")) {
    return null;
  }

  if (path.startsWith("/personal-profile")) {
    return null;
  }

  if (path.startsWith("/login") || path.startsWith("/auth")) {
    return "/";
  }

  return path;
}
