import "server-only";
import { ID, Permission, Query, Role, TablesDB, type Models } from "node-appwrite";
import { getAppwriteHelpers } from "./auth";

export const PRIORITIES = ["low", "medium", "high"] as const;
export type Priority = (typeof PRIORITIES)[number];

export type TaskDto = {
  id: string;
  title: string;
  scheduledDate: string | null;
  completed: boolean;
  position: number;
  priority: Priority;
  description: string;
  note: string;
};

type TaskRow = Models.Row & {
  userId: string;
  title: string;
  scheduledDate?: string | null;
  completed: boolean;
  position: number;
  priority?: string | null;
  description?: string | null;
  note?: string | null;
};

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

const GAP = 1024;
const PAGE = 500;

function ids() {
  const databaseId = process.env.APPWRITE_DATABASE_ID;
  const tableId = process.env.APPWRITE_TASKS_TABLE_ID;
  if (!databaseId || !tableId)
    throw new HttpError(500, "Task storage is not configured.");
  return { databaseId, tableId };
}

/** Session-scoped DB handle. Row permissions are enforced by Appwrite. */
export async function getTaskContext() {
  const session = await getAppwriteHelpers().createSessionClient();
  if (!session) throw new HttpError(401, "Not signed in.");
  let userId: string;
  try {
    userId = (await session.account.get()).$id;
  } catch {
    throw new HttpError(401, "Not signed in.");
  }
  return { db: new TablesDB(session.client), userId, ...ids() };
}
type Ctx = Awaited<ReturnType<typeof getTaskContext>>;

const toDto = (row: TaskRow): TaskDto => ({
  id: row.$id,
  title: row.title,
  scheduledDate: row.scheduledDate ? row.scheduledDate : null,
  completed: row.completed,
  position: row.position,
  priority: PRIORITIES.includes(row.priority as Priority)
    ? (row.priority as Priority)
    : "medium",
  description: row.description ?? "",
  note: row.note ?? "",
});

export function parseDate(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    throw new HttpError(400, "Invalid date.");
  const [y, m, d] = value.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  if (
    date.getUTCFullYear() !== y ||
    date.getUTCMonth() !== m - 1 ||
    date.getUTCDate() !== d
  )
    throw new HttpError(400, "Invalid date.");
  return value;
}

export function parseTitle(value: unknown): string {
  if (typeof value !== "string") throw new HttpError(400, "Invalid title.");
  const title = value.trim();
  if (!title || title.length > 200)
    throw new HttpError(400, "Judul tugas harus 1–200 karakter.");
  return title;
}

export function parsePriority(value: unknown): Priority {
  if (!PRIORITIES.includes(value as Priority))
    throw new HttpError(400, "Invalid priority.");
  return value as Priority;
}

export function parseText(value: unknown, max: number, label: string): string {
  if (value === null || value === undefined) return "";
  if (typeof value !== "string" || value.length > max)
    throw new HttpError(400, `${label} maksimal ${max} karakter.`);
  return value.trim();
}

const DESCRIPTION_MAX = 2000;
const NOTE_MAX = 5000;

async function ownedRows(ctx: Ctx): Promise<TaskRow[]> {
  // Page through every row; long analytics periods can exceed one page.
  const rows: TaskRow[] = [];
  let cursor: string | null = null;
  for (let page = 0; page < 40; page += 1) {
    const queries = [Query.equal("userId", [ctx.userId]), Query.limit(PAGE)];
    if (cursor) queries.push(Query.cursorAfter(cursor));
    const result: Models.RowList<TaskRow> = await ctx.db.listRows<TaskRow>({
      databaseId: ctx.databaseId,
      tableId: ctx.tableId,
      queries,
    });
    rows.push(...result.rows);
    if (result.rows.length < PAGE) break;
    cursor = result.rows[result.rows.length - 1].$id;
  }
  return rows;
}

async function getOwned(ctx: Ctx, taskId: string): Promise<TaskRow> {
  try {
    const row = await ctx.db.getRow<TaskRow>({
      databaseId: ctx.databaseId,
      tableId: ctx.tableId,
      rowId: taskId,
    });
    // Another user's row is reported as not found.
    if (row.userId !== ctx.userId) throw new HttpError(404, "Not found.");
    return row;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(404, "Not found.");
  }
}

function nextPosition(rows: TaskRow[], date: string | null, skipId?: string) {
  const key = date ?? "";
  const positions = rows
    .filter((r) => (r.scheduledDate ?? "") === key && r.$id !== skipId)
    .map((r) => r.position);
  return Math.max(0, ...positions) + GAP;
}

export async function listTasks(
  ctx: Ctx,
  opts: { from?: string | null; through?: string | null; unscheduled?: boolean },
) {
  const rows = await ownedRows(ctx);
  return rows
    .filter((r) => {
      const date = r.scheduledDate ? r.scheduledDate : null;
      if (opts.unscheduled) return date === null;
      if (opts.from && opts.through)
        return date !== null && date >= opts.from && date <= opts.through;
      return true;
    })
    .sort((a, b) => a.position - b.position)
    .map(toDto);
}

export async function createTask(
  ctx: Ctx,
  input: {
    title: unknown;
    scheduledDate: unknown;
    priority?: unknown;
    description?: unknown;
    note?: unknown;
  },
) {
  const title = parseTitle(input.title);
  const scheduledDate = parseDate(input.scheduledDate);
  const priority =
    input.priority === undefined ? "medium" : parsePriority(input.priority);
  const description = parseText(input.description, DESCRIPTION_MAX, "Deskripsi");
  const note = parseText(input.note, NOTE_MAX, "Catatan");
  const position = nextPosition(await ownedRows(ctx), scheduledDate);
  const owner = Role.user(ctx.userId);
  const row = await ctx.db.createRow<TaskRow>({
    databaseId: ctx.databaseId,
    tableId: ctx.tableId,
    rowId: ID.unique(),
    data: {
      userId: ctx.userId,
      title,
      scheduledDate: scheduledDate ?? "",
      completed: false,
      position,
      priority,
      description,
      note,
    },
    permissions: [
      Permission.read(owner),
      Permission.update(owner),
      Permission.delete(owner),
    ],
  });
  return toDto(row);
}

export async function updateTask(
  ctx: Ctx,
  taskId: string,
  input: Record<string, unknown>,
) {
  const current = await getOwned(ctx, taskId);
  const data: Record<string, unknown> = {};
  if ("title" in input) data.title = parseTitle(input.title);
  if ("priority" in input) data.priority = parsePriority(input.priority);
  if ("description" in input)
    data.description = parseText(input.description, DESCRIPTION_MAX, "Deskripsi");
  if ("note" in input) data.note = parseText(input.note, NOTE_MAX, "Catatan");
  if ("completed" in input) {
    if (typeof input.completed !== "boolean")
      throw new HttpError(400, "Invalid completed flag.");
    data.completed = input.completed;
  }
  if ("position" in input) {
    if (typeof input.position !== "number" || !Number.isFinite(input.position))
      throw new HttpError(400, "Invalid position.");
    data.position = input.position;
  }
  if ("scheduledDate" in input) {
    const date = parseDate(input.scheduledDate);
    data.scheduledDate = date ?? "";
    const changed = (current.scheduledDate ? current.scheduledDate : null) !== date;
    if (changed && !("position" in input))
      data.position = nextPosition(await ownedRows(ctx), date, taskId);
  }
  if (!Object.keys(data).length) throw new HttpError(400, "Nothing to update.");
  const row = await ctx.db.updateRow<TaskRow>({
    databaseId: ctx.databaseId,
    tableId: ctx.tableId,
    rowId: taskId,
    data,
  });
  return toDto(row);
}

export async function deleteTask(ctx: Ctx, taskId: string) {
  await getOwned(ctx, taskId);
  await ctx.db.deleteRow({
    databaseId: ctx.databaseId,
    tableId: ctx.tableId,
    rowId: taskId,
  });
}
