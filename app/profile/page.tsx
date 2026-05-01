import { redirect } from "next/navigation";
import {
  deleteProfileAvatar,
  generatéProfileAvatar,
  updateProfile,
  uploadProfileAvatar
} from "@/app/profile/actions";
import { AppShell } from "@/components/app-shell";
import { UserAvatar } from "@/components/user-avatar";
import {
  densityOptions,
  fontOptions,
  getUserProfile,
  themeOptions
} from "@/lib/profile";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function ProfilePage({
  searchParams
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { error, success } = await searchParams;
  const profileResult = await getUserProfile(supabase, user);
  const { profile } = profileResult;

  return (
    <AppShell userEmail={user.email}>
      <section className="profile-page">
        <div className="profile-hero panel">
          <div className="profile-identity">
            <UserAvatar profile={profile} size="lg" />
            <div>
              <p className="section-label">Perfil e aparência</p>
              <h2>{profile.displayName}</h2>
              <p className="supporting-copy">
                Personalize sua identidade, foto, tema, fonte e densidade do
                Deniaros.
              </p>
            </div>
          </div>
          <div className="profile-badges">
            <span className="status-chip">{profile.themeId}</span>
            <span className="status-chip">{profile.fontId}</span>
            <span className="status-chip">{profile.density}</span>
          </div>
        </div>

        {profileResult.error ? (
          <section className="source-banner">
            <strong>Perfil aguardando migration</strong>
            <span>
              Execute supabase/migrations/0002_user_profiles_and_avatars.sql no
              SQL Editor para salvar foto, tema e preferenciais.
            </span>
          </section>
        ) : null}

        {error ? <p className="form-error">{error}</p> : null}
        {success ? <p className="form-success">{success}</p> : null}

        <div className="profile-grid">
          <section className="panel profile-card">
            <div className="panel-header">
              <div>
                <p className="section-label">Identidade</p>
                <h3>Seu nome no sistema</h3>
              </div>
              <span className="status-chip">Personalizável</span>
            </div>

            <form action={updateProfile} className="entity-form profile-form">
              <label>
                Nome de exibicao
                <input
                  defaultValue={profile.displayName}
                  name="displayName"
                  placeholder="Ex.: Werbet Alves"
                />
              </label>

              <label>
                Nome de usuário
                <input
                  defaultValue={profile.username}
                  name="username"
                  placeholder="werbet_alves"
                />
              </label>

              <label className="wide-field">
                Direção para avatar com IA
                <textarea
                  defaultValue={profile.aiAvatarPrompt}
                  name="aiAvatarPrompt"
                  placeholder="Ex.: retrato clássico, luz quente, escritório financeiro rústico"
                  rows={4}
                />
              </label>

              <label>
                Tema
                <select defaultValue={profile.themeId} name="themeId">
                  {themeOptions.map((theme) => (
                    <option key={theme.id} value={theme.id}>
                      {theme.label}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Fonte
                <select defaultValue={profile.fontId} name="fontId">
                  {fontOptions.map((font) => (
                    <option key={font.id} value={font.id}>
                      {font.label}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Densidade
                <select defaultValue={profile.density} name="density">
                  {densityOptions.map((density) => (
                    <option key={density.id} value={density.id}>
                      {density.label}
                    </option>
                  ))}
                </select>
              </label>

              <div className="option-showcase wide-field">
                {themeOptions.map((theme) => (
                  <article className={`theme-swatch swatch-${theme.id}`} key={theme.id}>
                    <strong>{theme.label}</strong>
                    <p>{theme.description}</p>
                  </article>
                ))}
              </div>

              <div className="form-actions">
                <button className="primary-button" type="submit">
                  Salvar preferências
                </button>
              </div>
            </form>
          </section>

          <aside className="panel profile-card">
            <div className="panel-header">
              <div>
                <p className="section-label">Foto</p>
                <h3>Avatar do perfil</h3>
              </div>
            </div>

            <div className="avatar-studio">
              <UserAvatar profile={profile} size="lg" />
              <p className="supporting-copy">
                Use uma foto própria, remova quando quiser, ou gere uma imagem
                automaticamente pelo prompt.
              </p>
            </div>

            <form action={uploadProfileAvatar} className="stacked-form">
              <label>
                Carregar própria foto
                <input accept="image/*" name="avatar" type="file" />
              </label>
              <button className="ghost-button" type="submit">
                Enviar foto
              </button>
            </form>

            <form action={generatéProfileAvatar} className="stacked-form">
              <input name="displayName" type="hidden" value={profile.displayName} />
              <label>
                Prompt da foto automática
                <textarea
                  defaultValue={profile.aiAvatarPrompt}
                  name="aiAvatarPrompt"
                  placeholder="Ex.: diretor financeiro, clássico, luz cinematográfica"
                  rows={4}
                />
              </label>
              <button className="primary-button" type="submit">
                Gerar avatar com IA
              </button>
              <p className="micro-copy">
                Se GEMINI_API_KEY não estiver configurada, o sistema gera um
                avatar automático elegante como fallback.
              </p>
            </form>

            <form action={deleteProfileAvatar} className="stacked-form">
              <button className="ghost-button danger-button" type="submit">
                Excluir foto atual
              </button>
            </form>
          </aside>
        </div>
      </section>
    </AppShell>
  );
}
