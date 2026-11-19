import { NextResponse } from "next/server";
import { handleError } from "@/lib/appwrite/http";
import { getProfileContext } from "@/lib/appwrite/profile";
import { calendarStatus, disconnectCalendar, listCalendarEvents } from "@/lib/appwrite/calendar";

export const dynamic = "force-dynamic";

/** `?from=YYYY-MM-DD&through=YYYY-MM-DD` returns events; no params returns status. */
export async function GET(request: Request) {
  try {
    const ctx = await getProfileContext();
    const params = new URL(request.url).searchParams;
    const from = params.get("from");
    const through = params.get("through");
    if (from && through)
      return NextResponse.json({ events: await listCalendarEvents(ctx, from, through) });
    return NextResponse.json(await calendarStatus(ctx));
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE() {
  try {
    return NextResponse.json(await disconnectCalendar(await getProfileContext()));
  } catch (error) {
    return handleError(error);
  }
}
