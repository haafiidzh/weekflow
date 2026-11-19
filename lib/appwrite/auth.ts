import "server-only";
import { createNextServerHelpers } from "@appwrite.io/react/server/next";
import { getPublicAppwriteConfig } from "./config";

/** Server helpers bound to the current request's Appwrite session cookie. */
export function getAppwriteHelpers() {
  return createNextServerHelpers(getPublicAppwriteConfig());
}

export async function getAppwriteSession() {
  return (await getAppwriteHelpers().readSessionCookie()) ?? null;
}

/** Trusted user lookup: validates the session cookie against Appwrite. */
export async function getAppwriteUser() {
  if (!(await getAppwriteSession())) return null;
  try {
    return await getAppwriteHelpers().getLoggedInUser();
  } catch {
    return null;
  }
}
