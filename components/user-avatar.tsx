import { getProfileInitials, type UserProfile } from "@/lib/profile";

export function UserAvatar({
  profile,
  size = "md"
}: {
  profile: UserProfile;
  size?: "sm" | "md" | "lg";
}) {
  const initials = getProfileInitials(profile) || "D";

  return (
    <span className={`user-avatar user-avatar-${size}`}>
      {profile.avatarUrl ? (
        <img alt={`Foto de ${profile.displayName}`} src={profile.avatarUrl} />
      ) : (
        <span>{initials}</span>
      )}
    </span>
  );
}
