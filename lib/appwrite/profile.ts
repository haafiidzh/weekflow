import "server-only";
import { ID, Permission, Role, Storage } from "node-appwrite";
import { InputFile } from "node-appwrite/file";
import { getAppwriteHelpers } from "./auth";
import { HttpError } from "./tasks";

export const MAX_AVATAR_BYTES = 2 * 1024 * 1024;
const NAME_MAX = 64;

export type ProfileDto = {
  firstName: string;
  lastName: string;
  name: string;
  avatarUrl: string | null;
};

function bucketId() {
  const id = process.env.APPWRITE_AVATARS_BUCKET_ID;
  if (!id) throw new HttpError(500, "Avatar storage is not configured.");
  return id;
}

export async function getProfileContext() {
  const session = await getAppwriteHelpers().createSessionClient();
  if (!session) throw new HttpError(401, "Not signed in.");
  let user;
  try {
    user = await session.account.get();
  } catch {
    throw new HttpError(401, "Not signed in.");
  }
  return { session, user, storage: new Storage(session.client) };
}
type Ctx = Awaited<ReturnType<typeof getProfileContext>>;

export function toProfile(user: {
  name: string;
  prefs: Record<string, unknown>;
}): ProfileDto {
  const prefs = user.prefs ?? {};
  const firstName = typeof prefs.firstName === "string" ? prefs.firstName : "";
  const lastName = typeof prefs.lastName === "string" ? prefs.lastName : "";
  const avatarId = typeof prefs.avatarId === "string" ? prefs.avatarId : "";
  return {
    firstName,
    lastName,
    name: user.name,
    avatarUrl: avatarId
      ? `/api/profile/avatar?v=${encodeURIComponent(avatarId)}`
      : null,
  };
}

function cleanName(value: unknown, label: string): string {
  if (typeof value !== "string") throw new HttpError(400, `Invalid ${label}.`);
  const text = value.replace(/\s+/g, " ").trim();
  if (text.length > NAME_MAX)
    throw new HttpError(400, `${label} must be at most ${NAME_MAX} characters.`);
  return text;
}

export async function updateNames(ctx: Ctx, body: Record<string, unknown>) {
  const firstName = cleanName(body.firstName, "First name");
  const lastName = cleanName(body.lastName, "Last name");
  const fallback = ctx.user.email.split("@")[0];
  const name = `${firstName} ${lastName}`.trim() || fallback;
  await ctx.session.account.updateName({ name });
  // updatePrefs replaces the whole object, so merge with what is stored.
  await ctx.session.account.updatePrefs({
    prefs: { ...ctx.user.prefs, firstName, lastName },
  });
  const user = await ctx.session.account.get();
  return toProfile(user);
}

const SIGNATURES: [string, number[]][] = [
  ["image/png", [0x89, 0x50, 0x4e, 0x47]],
  ["image/jpeg", [0xff, 0xd8, 0xff]],
];
function sniff(bytes: Buffer): "image/png" | "image/jpeg" | "image/webp" | null {
  for (const [type, sig] of SIGNATURES)
    if (sig.every((b, i) => bytes[i] === b)) return type as "image/png";
  if (
    bytes.subarray(0, 4).toString("ascii") === "RIFF" &&
    bytes.subarray(8, 12).toString("ascii") === "WEBP"
  )
    return "image/webp";
  return null;
}

async function dropFile(ctx: Ctx, fileId: unknown) {
  if (typeof fileId !== "string" || !fileId) return;
  try {
    await ctx.storage.deleteFile({ bucketId: bucketId(), fileId });
  } catch {}
}

async function storeAvatar(ctx: Ctx, bytes: Buffer): Promise<string> {
  if (bytes.length > MAX_AVATAR_BYTES)
    throw new HttpError(413, "Avatar must be 2 MB or smaller.");
  const type = sniff(bytes);
  if (!type) throw new HttpError(400, "Avatar must be a PNG, JPEG or WebP image.");
  const ext = type === "image/png" ? "png" : type === "image/webp" ? "webp" : "jpg";
  const created = await ctx.storage.createFile({
    bucketId: bucketId(),
    fileId: ID.unique(),
    file: InputFile.fromBuffer(bytes, `avatar.${ext}`),
    permissions: [
      Permission.read(Role.user(ctx.user.$id)),
      Permission.delete(Role.user(ctx.user.$id)),
    ],
  });
  return created.$id;
}

export async function replaceAvatar(ctx: Ctx, file: File) {
  if (file.size > MAX_AVATAR_BYTES)
    throw new HttpError(413, "Avatar must be 2 MB or smaller.");
  const avatarId = await storeAvatar(ctx, Buffer.from(await file.arrayBuffer()));
  try {
    await ctx.session.account.updatePrefs({
      prefs: { ...ctx.user.prefs, avatarId },
    });
  } catch (error) {
    await dropFile(ctx, avatarId);
    throw error;
  }
  await dropFile(ctx, ctx.user.prefs?.avatarId);
  return toProfile(await ctx.session.account.get());
}

type GoogleInfo = {
  picture?: string;
  given_name?: string;
  family_name?: string;
};

async function fetchGoogleInfo(token: string): Promise<GoogleInfo | null> {
  try {
    const response = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(5000),
    });
    return response.ok ? ((await response.json()) as GoogleInfo) : null;
  } catch {
    return null;
  }
}

async function fetchGooglePicture(url: unknown): Promise<Buffer | null> {
  if (typeof url !== "string") return null;
  try {
    const parsed = new URL(url);
    // Only follow Google's image CDN; the URL comes from a third party.
    if (parsed.protocol !== "https:" || !/(^|\.)googleusercontent\.com$/.test(parsed.hostname))
      return null;
    const response = await fetch(parsed, { signal: AbortSignal.timeout(5000) });
    if (!response.ok) return null;
    const bytes = Buffer.from(await response.arrayBuffer());
    return bytes.length <= MAX_AVATAR_BYTES ? bytes : null;
  } catch {
    return null;
  }
}

/**
 * One-time import of name and photo for users who signed in with Google.
 * Runs at most once per account (profileSynced), so a user who later removes
 * their avatar does not get it back.
 */
export async function syncProviderProfile(ctx: Ctx) {
  const prefs = (ctx.user.prefs ?? {}) as Record<string, unknown>;
  if (prefs.profileSynced) return toProfile(ctx.user);

  let current;
  try {
    current = await ctx.session.account.getSession({ sessionId: "current" });
  } catch {
    return toProfile(ctx.user);
  }

  const next: Record<string, unknown> = { ...prefs, profileSynced: true };
  let newName: string | null = null;
  let uploaded: string | null = null;

  if (current.provider === "google" && current.providerAccessToken) {
    const info = await fetchGoogleInfo(current.providerAccessToken);
    if (!info) return toProfile(ctx.user); // transient failure: try again later
    if (!prefs.firstName && !prefs.lastName) {
      next.firstName = (info.given_name ?? "").trim().slice(0, NAME_MAX);
      next.lastName = (info.family_name ?? "").trim().slice(0, NAME_MAX);
      newName = `${next.firstName} ${next.lastName}`.trim() || null;
    }
    if (!prefs.avatarId) {
      const bytes = await fetchGooglePicture(info.picture);
      if (bytes) {
        try {
          uploaded = await storeAvatar(ctx, bytes);
          next.avatarId = uploaded;
        } catch {}
      }
    }
  }

  try {
    await ctx.session.account.updatePrefs({ prefs: next });
  } catch (error) {
    if (uploaded) await dropFile(ctx, uploaded);
    throw error;
  }
  if (newName) await ctx.session.account.updateName({ name: newName });
  return toProfile(await ctx.session.account.get());
}

export async function removeAvatar(ctx: Ctx) {
  const { avatarId, ...rest } = (ctx.user.prefs ?? {}) as Record<string, unknown>;
  await ctx.session.account.updatePrefs({ prefs: rest });
  await dropFile(ctx, avatarId);
  return toProfile(await ctx.session.account.get());
}

export async function readAvatar(ctx: Ctx) {
  const avatarId = ctx.user.prefs?.avatarId;
  if (typeof avatarId !== "string" || !avatarId)
    throw new HttpError(404, "No avatar.");
  const data = await ctx.storage.getFileView({
    bucketId: bucketId(),
    fileId: avatarId,
  });
  const bytes = Buffer.from(data);
  return { bytes, type: sniff(bytes) ?? "image/jpeg" };
}
