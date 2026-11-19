import { NextResponse } from "next/server";
import { handleError } from "@/lib/appwrite/http";
import { getProfileContext, syncProviderProfile } from "@/lib/appwrite/profile";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const ctx = await getProfileContext();
    return NextResponse.json(await syncProviderProfile(ctx));
  } catch (error) {
    return handleError(error);
  }
}
