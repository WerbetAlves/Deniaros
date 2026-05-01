import type { SupabaseClient, User } from "@supabase/supabase-js";

export const themeOptions = [
  {
    id: "classic",
    label: "Clássico rústico",
    description: "Verde profundo, papel envelhecido e dourado discreto."
  },
  {
    id: "atlantic",
    label: "Atlantico",
    description: "Azul petroleo, areia clara e leitura mais serena."
  },
  {
    id: "graphite",
    label: "Grafite executivo",
    description: "Contrasté sóbrio para uma mêsa financeira premium."
  },
  {
    id: "terracotta",
    label: "Terracota",
    description: "Tons quentes, artesanais e clássicos."
  }
] as const;

export const fontOptions = [
  {
    id: "classic",
    label: "Clássica",
    description: "Serifada nos titulos, limpa no corpo."
  },
  {
    id: "editorial",
    label: "Editorial",
    description: "Mais literaria, com presenca de revista financeira."
  },
  {
    id: "ledger",
    label: "Livro-caixa",
    description: "Toque monoespacado para quem ama lançamentos."
  },
  {
    id: "clean",
    label: "Limpa",
    description: "Mais direta, compacta e operacional."
  }
] as const;

export const densityOptions = [
  {
    id: "comfortable",
    label: "Confortavel",
    description: "Equilíbrio entre leitura e densidade."
  },
  {
    id: "compact",
    label: "Compacta",
    description: "Mais informação na tela."
  },
  {
    id: "spacious",
    label: "Espaçosa",
    description: "Respira mais, boa para telas grandes."
  }
] as const;

export type ThemeId = (typeof themeOptions)[number]["id"];
export type FontId = (typeof fontOptions)[number]["id"];
export type DensityId = (typeof densityOptions)[number]["id"];

export type UserProfile = {
  userId: string;
  displayName: string;
  username: string;
  avatarUrl?: string;
  avatarPath?: string;
  themeId: ThemeId;
  fontId: FontId;
  density: DensityId;
  aiAvatarPrompt: string;
};

type UserProfileRow = {
  user_id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  avatar_path: string | null;
  theme_id: string | null;
  font_id: string | null;
  density: string | null;
  ai_avatar_prompt: string | null;
};

export type ProfileResult = {
  profile: UserProfile;
  persisted: boolean;
  error?: string;
};

export function getFallbackProfile(user: User): UserProfile {
  const metadataName =
    typeof user.user_metadata?.display_name === "string"
      ? user.user_metadata.display_name
      : "";
  const emailName = user.email?.split("@")[0] ?? "Usuário";

  return {
    userId: user.id,
    displayName: metadataName || emailName,
    username: "",
    themeId: "classic",
    fontId: "classic",
    density: "comfortable",
    aiAvatarPrompt: "",
    avatarUrl:
      typeof user.user_metadata?.avatar_url === "string"
        ? user.user_metadata.avatar_url
        : undefined
  };
}

export async function getUserProfile(
  supabase: SupabaseClient,
  user: User
): Promise<ProfileResult> {
  const fallback = getFallbackProfile(user);

  const { data, error } = await supabase
    .from("user_profiles")
    .select(
      "user_id,display_name,username,avatar_url,avatar_path,theme_id,font_id,density,ai_avatar_prompt"
    )
    .eq("user_id", user.id)
    .maybeSingle<UserProfileRow>();

  if (error) {
    return {
      profile: fallback,
      persisted: false,
      error: error.message
    };
  }

  if (!data) {
    return {
      profile: fallback,
      persisted: false
    };
  }

  return {
    profile: {
      userId: data.user_id,
      displayName: data.display_name || fallback.displayName,
      username: data.username ?? "",
      avatarUrl: data.avatar_url ?? fallback.avatarUrl,
      avatarPath: data.avatar_path ?? undefined,
      themeId: normalizeThemeId(data.theme_id),
      fontId: normalizeFontId(data.font_id),
      density: normalizeDensityId(data.density),
      aiAvatarPrompt: data.ai_avatar_prompt ?? ""
    },
    persisted: true
  };
}

export function getProfileInitials(profile: Pick<UserProfile, "displayName">) {
  return profile.displayName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function normalizeThemeId(value: FormDataEntryValue | string | null) {
  const raw = String(value ?? "");
  return themeOptions.some((option) => option.id === raw)
    ? (raw as ThemeId)
    : "classic";
}

export function normalizeFontId(value: FormDataEntryValue | string | null) {
  const raw = String(value ?? "");
  return fontOptions.some((option) => option.id === raw)
    ? (raw as FontId)
    : "classic";
}

export function normalizeDensityId(value: FormDataEntryValue | string | null) {
  const raw = String(value ?? "");
  return densityOptions.some((option) => option.id === raw)
    ? (raw as DensityId)
    : "comfortable";
}
