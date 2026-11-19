import { NextResponse } from "next/server";
import { handleError, readJson } from "@/lib/appwrite/http";
import { getProfileContext, toProfile, updateNames } from "@/lib/appwrite/profile";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const ctx = await getProfileContext();
    return NextResponse.json(toProfile(ctx.user));
  } catch (error) {
    return handleError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const ctx = await getProfileContext();
    return NextResponse.json(await updateNames(ctx, await readJson(request)));
  } catch (error) {
    return handleError(error);
  }
}
