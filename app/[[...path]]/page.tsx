import { redirect } from "next/navigation";
import AppRouter from "@/components/AppRouter";
import { toLocalSession } from "@/lib/auth";
import { getAppwriteUser } from "@/lib/appwrite/auth";

const PROTECTED = new Set(["planner", "analytics", "settings"]);

export default async function Page({
  params,
}: {
  params: Promise<{ path?: string[] }>;
}) {
  const { path } = await params;
  const first = path?.[0];
  const user = await getAppwriteUser();
  if (path?.length === 1 && first && PROTECTED.has(first) && !user)
    redirect("/login");
  return (
    <AppRouter
      initialSession={user ? toLocalSession(user) : null}
    />
  );
}
