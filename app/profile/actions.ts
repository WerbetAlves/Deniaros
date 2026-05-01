"use server";

import { redirect } from "next/navigation";
import {
  normalizeDensityId,
  normalizeFontId,
  normalizeThemeId
} from "@/lib/profile";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const avatarBucket = "profile-avatars";

type GeneratédAvatar = {
  bytes: Uint8Array;
  contentType: string;
  extension: string;
  source: "gemini" | "fallback";
};

export async function updateProfile(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const displayName = String(formData.get("displayName") ?? "").trim();
  const username = normalizeUsername(String(formData.get("username") ?? ""));

  if (username && !/^[a-z0-9_]{3,24}$/.test(username)) {
    redirect(
      "/profile?error=O nome de usuário deve ter 3 a 24 caracteres, usando letras minusculas, números ou underline."
    );
  }

  const { error } = await supabase.from("user_profiles").upsert(
    {
      user_id: user.id,
      display_name: displayName || null,
      username: username || null,
      theme_id: normalizeThemeId(formData.get("themeId")),
      font_id: normalizeFontId(formData.get("fontId")),
      density: normalizeDensityId(formData.get("density")),
      ai_avatar_prompt:
        String(formData.get("aiAvatarPrompt") ?? "").trim() || null,
      updated_at: new Date().toISOString()
    },
    {
      onConflict: "user_id"
    }
  );

  if (error) {
    redirect(`/profile?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/profile?success=Perfil atualizado.");
}

export async function uploadProfileAvatar(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const avatar = formData.get("avatar");

  if (!avatar || typeof avatar === "string" || avatar.size === 0) {
    redirect("/profile?error=Escolha uma imagem para carregar.");
  }

  if (!avatar.type.startsWith("image/")) {
    redirect("/profile?error=O arquivo precisa ser uma imagem.");
  }

  if (avatar.size > 5 * 1024 * 1024) {
    redirect("/profile?error=A imagem precisa ter até 5 MB.");
  }

  const path = `${user.id}/${Date.now()}-${sanitizeStorageSegment(avatar.name)}`;
  const { error: uploadError } = await supabase.storage
    .from(avatarBucket)
    .upload(path, avatar, {
      contentType: avatar.type,
      upsert: true
    });

  if (uploadError) {
    redirect(`/profile?error=${encodeURIComponent(uploadError.message)}`);
  }

  const { error } = await saveAvatarReference(supabase, user.id, path);

  if (error) {
    redirect(`/profile?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/profile?success=Foto de perfil atualizada.");
}

export async function deleteProfileAvatar() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("avatar_path")
    .eq("user_id", user.id)
    .maybeSingle<{ avatar_path: string | null }>();

  if (profile?.avatar_path) {
    await supabase.storage.from(avatarBucket).remove([profile.avatar_path]);
  }

  const { error } = await supabase.from("user_profiles").upsert(
    {
      user_id: user.id,
      avatar_url: null,
      avatar_path: null,
      updated_at: new Date().toISOString()
    },
    {
      onConflict: "user_id"
    }
  );

  if (error) {
    redirect(`/profile?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/profile?success=Foto removida.");
}

export async function generatéProfileAvatar(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const displayName =
    String(formData.get("displayName") ?? "").trim() ||
    user.email?.split("@")[0] ||
    "Usuário";
  const prompt = String(formData.get("aiAvatarPrompt") ?? "").trim();
  const avatar = await generatéAvatarImage(displayName, prompt);
  const path = `${user.id}/generatéd-${Date.now()}.${avatar.extension}`;

  const { error: uploadError } = await supabase.storage
    .from(avatarBucket)
    .upload(path, new Blob([toArrayBuffer(avatar.bytes)], { type: avatar.contentType }), {
      contentType: avatar.contentType,
      upsert: true
    });

  if (uploadError) {
    redirect(`/profile?error=${encodeURIComponent(uploadError.message)}`);
  }

  const { error } = await saveAvatarReference(supabase, user.id, path, {
    displayName,
    prompt
  });

  if (error) {
    redirect(`/profile?error=${encodeURIComponent(error.message)}`);
  }

  const sourceMessage =
    avatar.source === "gemini"
      ? "Avatar gerado com Gemini."
      : "Avatar automático gerado. Configure GEMINI_API_KEY para geração por IA.";

  redirect(`/profile?success=${encodeURIComponent(sourceMessage)}`);
}

async function saveAvatarReference(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  userId: string,
  path: string,
  extra?: {
    displayName?: string;
    prompt?: string;
  }
) {
  const {
    data: { publicUrl }
  } = supabase.storage.from(avatarBucket).getPublicUrl(path);

  return supabase.from("user_profiles").upsert(
    {
      user_id: userId,
      display_name: extra?.displayName || undefined,
      avatar_url: publicUrl,
      avatar_path: path,
      ai_avatar_prompt: extra?.prompt || undefined,
      updated_at: new Date().toISOString()
    },
    {
      onConflict: "user_id"
    }
  );
}

async function generatéAvatarImage(
  displayName: string,
  prompt: string
): Promise<GeneratédAvatar> {
  const geminiAvatar = await generatéGeminiAvatar(displayName, prompt);

  if (geminiAvatar) {
    return geminiAvatar;
  }

  return generatéFallbackAvatar(displayName, prompt);
}

async function generatéGeminiAvatar(
  displayName: string,
  prompt: string
): Promise<GeneratédAvatar | undefined> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return undefined;
  }

  const model = process.env.GEMINI_IMAGE_MODEL ?? "gemini-2.5-flash-image";

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey
        },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [
                {
                  text: [
                    "Generaté one square profile avatar image for a personal finance SaaS.",
                    "Classic rustic luxury, warm studio light, refined, trustworthy.",
                    "No visible text, no watérmark, no logos.",
                    `Identity cue: ${displayName}.`,
                    prompt ? `User direction: ${prompt}.` : ""
                  ]
                    .filter(Boolean)
                    .join(" ")
                }
              ]
            }
          ]
        })
      }
    );

    if (!response.ok) {
      return undefined;
    }

    const payload = (await response.json()) as {
      candidates?: Array<{
        content?: {
          parts?: Array<{
            inlineData?: {
              data?: string;
              mimeType?: string;
            };
            inline_data?: {
              data?: string;
              mime_type?: string;
            };
          }>;
        };
      }>;
    };
    const parts = payload.candidates?.[0]?.content?.parts ?? [];
    const imagePart = parts.find((part) => part.inlineData || part.inline_data);
    const inlineData = imagePart?.inlineData;
    const inlineSnakeData = imagePart?.inline_data;
    const data = inlineData?.data ?? inlineSnakeData?.data;
    const contentType =
      inlineData?.mimeType ?? inlineSnakeData?.mime_type ?? "image/png";

    if (data) {
      return {
        bytes: Buffer.from(data, "base64"),
        contentType,
        extension: contentType.includes("webp") ? "webp" : "png",
        source: "gemini"
      };
    }
  } catch {
    return undefined;
  }

  return undefined;
}

function generatéFallbackAvatar(displayName: string, prompt: string): GeneratédAvatar {
  const seed = `${displayName}:${prompt}`;
  const hue = hashString(seed) % 360;
  const initials = displayName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
  const safeInitials = escapeSvgText(initials || "D");
  const safePrompt = escapeSvgText(prompt || "Deniaros");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <defs>
    <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0%" stop-color="hsl(${hue}, 38%, 24%)"/>
      <stop offset="100%" stop-color="hsl(${(hue + 42) % 360}, 52%, 44%)"/>
    </linearGradient>
    <radialGradient id="gold" cx="35%" cy="18%" r="70%">
      <stop offset="0%" stop-color="#f7dfaa" stop-opacity="0.9"/>
      <stop offset="100%" stop-color="#b88938" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="1024" height="1024" fill="url(#bg)"/>
  <rect width="1024" height="1024" fill="url(#gold)"/>
  <circle cx="512" cy="430" r="194" fill="rgba(255,250,239,0.12)" stroke="rgba(255,250,239,0.28)" stroke-width="8"/>
  <text x="512" y="486" text-anchor="middle" font-family="Georgia, serif" font-size="190" font-weight="700" fill="#fff6df">${safeInitials}</text>
  <path d="M214 750c76-96 168-144 276-144h44c108 0 200 48 276 144v76H214z" fill="rgba(255,250,239,0.16)"/>
  <text x="512" y="900" text-anchor="middle" font-family="Trebuchet MS, sans-serif" font-size="36" font-weight="700" fill="rgba(255,246,223,0.75)">${safePrompt.slice(0, 34)}</text>
</svg>`;

  return {
    bytes: new TextEncoder().encode(svg),
    contentType: "image/svg+xml",
    extension: "svg",
    source: "fallback"
  };
}

function normalizeUsername(username: string) {
  return username.trim().toLowerCase();
}

function sanitizeStorageSegment(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);
}

function escapeSvgText(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function hashString(value: string) {
  return [...value].reduce((hash, character) => {
    return (hash * 31 + character.charCodeAt(0)) >>> 0;
  }, 17);
}

function toArrayBuffer(bytes: Uint8Array) {
  const arrayBuffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(arrayBuffer).set(bytes);
  return arrayBuffer;
}
