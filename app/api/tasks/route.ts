import { after, NextResponse } from "next/server";
import { prepareCalendarSync } from "@/lib/appwrite/calendar";
import { handleError, readJson } from "@/lib/appwrite/http";
import {
  createTask,
  getTaskContext,
  listTasks,
  parseDate,
} from "@/lib/appwrite/tasks";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const ctx = await getTaskContext();
    const url = new URL(request.url);
    const from = parseDate(url.searchParams.get("from"));
    const through = parseDate(url.searchParams.get("through"));
    const unscheduled = url.searchParams.get("unscheduled") === "1";
    return NextResponse.json({
      tasks: await listTasks(ctx, { from, through, unscheduled }),
    });
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await getTaskContext();
    const body = await readJson(request);
    const task = await createTask(ctx, {
      title: body.title,
      scheduledDate: body.scheduledDate,
      priority: body.priority,
      description: body.description,
      note: body.note,
    });
    if (task.scheduledDate) {
      const sync = await prepareCalendarSync();
      if (sync) after(() => sync.upsert(task));
    }
    return NextResponse.json({ task }, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}
