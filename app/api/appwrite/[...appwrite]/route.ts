import { createAppwriteHandlers } from "@appwrite.io/react/handlers/next";

const apiKey = process.env.APPWRITE_API_KEY;
if (!apiKey) throw new Error("APPWRITE_API_KEY is required for the auth proxy.");

export const { GET, POST } = createAppwriteHandlers({
  endpoint: process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!,
  projectId: process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!,
  apiKey,
  basePath: "/api/appwrite",
  redirects: { success: "/planner", failure: "/login?error=oauth" },
});
