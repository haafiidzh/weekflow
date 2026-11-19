export type LocalSession = {
  id: string;
  email: string;
  name: string;
  /** Whether Appwrite has confirmed that the account owns this email address. */
  emailVerification: boolean;
  firstName: string;
  lastName: string;
  /** Same-origin URL of the private avatar, or null when none is set. */
  avatarUrl: string | null;
};

type UserLike = {
  $id: string;
  email: string;
  name: string;
  emailVerification: boolean;
  prefs?: Record<string, unknown> | null;
};

export function toLocalSession(user: UserLike): LocalSession {
  const prefs = user.prefs ?? {};
  const text = (value: unknown) => (typeof value === "string" ? value : "");
  const avatarId = text(prefs.avatarId);
  return {
    id: user.$id,
    email: user.email,
    name: user.name || user.email.split("@")[0],
    emailVerification: user.emailVerification,
    firstName: text(prefs.firstName),
    lastName: text(prefs.lastName),
    avatarUrl: avatarId
      ? `/api/profile/avatar?v=${encodeURIComponent(avatarId)}`
      : null,
  };
}
