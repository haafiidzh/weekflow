import { createAppwriteHandlers } from "@appwrite.io/react/handlers/next";

export const dynamic = "force-dynamic";

// Build lazily so `next build` does not fail when env vars are absent.
// Missing config is reported at request time instead.
let handlers: ReturnType<typeof createAppwriteHandlers> | null = null;

function getHandlers() {
  if (handlers) return handlers;
  const apiKey = process.env.APPWRITE_API_KEY;
  if (!apiKey) throw new Error("APPWRITE_API_KEY is required for the auth proxy.");
  handlers = createAppwriteHandlers({
    endpoint: process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!,
    projectId: process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!,
    apiKey,
    basePath: "/api/appwrite",
    redirects: { success: "/planner", failure: "/login?error=oauth" },
  });
  return handlers;
}

export function GET(...args: Parameters<ReturnType<typeof createAppwriteHandlers>["GET"]>) {
  return getHandlers().GET(...args);
}

export function POST(...args: Parameters<ReturnType<typeof createAppwriteHandlers>["POST"]>) {
  return getHandlers().POST(...args);
}
