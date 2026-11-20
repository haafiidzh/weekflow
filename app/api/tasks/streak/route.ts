import { NextResponse } from "next/server";
import { handleError } from "@/lib/appwrite/http";
import { getTaskContext, listCompletedDays } from "@/lib/appwrite/tasks";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const ctx = await getTaskContext();
    return NextResponse.json({ days: await listCompletedDays(ctx) });
  } catch (error) {
    return handleError(error);
  }
}
