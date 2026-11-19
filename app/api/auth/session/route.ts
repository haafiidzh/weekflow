import { NextResponse } from "next/server";
import { getAppwriteUser } from "@/lib/appwrite/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getAppwriteUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  return NextResponse.json({ id: user.$id, name: user.name, email: user.email });
}
