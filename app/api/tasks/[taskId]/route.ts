import { after, NextResponse } from "next/server";
import { prepareCalendarSync } from "@/lib/appwrite/calendar";
import { handleError, readJson } from "@/lib/appwrite/http";
import { deleteTask, getTaskContext, updateTask } from "@/lib/appwrite/tasks";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ taskId: string }> };

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { taskId } = await params;
    const ctx = await getTaskContext();
    const input = await readJson(request);
    const task = await updateTask(ctx, taskId, input);
    // Moving a card between columns only changes position: nothing to sync.
    if ("title" in input ||
      "completed" in input ||
      "scheduledDate" in input ||
      "description" in input ||
      "priority" in input) {
      const sync = await prepareCalendarSync();
      if (sync) after(() => sync.upsert(task));
    }
    return NextResponse.json({ task });
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const { taskId } = await params;
    const ctx = await getTaskContext();
    await deleteTask(ctx, taskId);
    const sync = await prepareCalendarSync();
    if (sync) after(() => sync.remove(taskId));
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleError(error);
  }
}
