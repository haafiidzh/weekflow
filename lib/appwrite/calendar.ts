import "server-only";
import { createHash } from "node:crypto";
import { getAppwriteHelpers } from "./auth";
import { getProfileContext } from "./profile";
import { HttpError } from "./tasks";

type Ctx = Pick<Awaited<ReturnType<typeof getProfileContext>>, "session">;

export type CalendarEvent = {
  id: string;
  title: string;
  /** YYYY-MM-DD of the day the event starts on. */
  date: string;
  /** ISO date-time, or null for all-day events. */
  start: string | null;
  end: string | null;
  allDay: boolean;
};

/**
 * Google access token of the current Appwrite session, refreshed when it is
 * about to expire. Null for sessions that did not come from Google.
 */
async function googleToken(ctx: Ctx): Promise<string | null> {
  const read = () => ctx.session.account.getSession({ sessionId: "current" });
  let current;
  try {
    current = await read();
  } catch {
    return null;
  }
  if (current.provider !== "google") return null;
  const expiry = Date.parse(current.providerAccessTokenExpiry ?? "");
  if (!current.providerAccessToken || (expiry && expiry - Date.now() < 60_000)) {
    try {
      current = await ctx.session.account.updateSession({ sessionId: "current" });
    } catch {
      return null;
    }
  }
  return current.providerAccessToken || null;
}

async function grantsCalendar(token: string): Promise<boolean> {
  try {
    const response = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?access_token=${encodeURIComponent(token)}`,
      { signal: AbortSignal.timeout(5000) },
    );
    if (!response.ok) return false;
    const { scope } = (await response.json()) as { scope?: string };
    // Events are written as well as read, so read-only grants do not count.
    return (scope ?? "")
      .split(" ")
      .some((item) => /\/auth\/calendar(\.events)?$/.test(item));
  } catch {
    return false;
  }
}

export async function calendarStatus(ctx: Ctx) {
  const token = await googleToken(ctx);
  return { connected: token ? await grantsCalendar(token) : false };
}

const DAY = /^\d{4}-\d{2}-\d{2}$/;

export async function listCalendarEvents(ctx: Ctx, from: string, through: string) {
  if (!DAY.test(from) || !DAY.test(through) || from > through)
    throw new HttpError(400, "Invalid date range.");
  const token = await googleToken(ctx);
  if (!token || !(await grantsCalendar(token)))
    throw new HttpError(409, "Google Calendar is not connected.");

  const day = (value: string, offset: number) => {
    const date = new Date(`${value}T00:00:00Z`);
    date.setUTCDate(date.getUTCDate() + offset);
    return date.toISOString();
  };
  const query = new URLSearchParams({
    timeMin: day(from, -1), // widen by a day: the range is local time, Google wants UTC
    timeMax: day(through, 2),
    singleEvents: "true",
    orderBy: "startTime",
    maxResults: "250",
  });
  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?${query}`,
    { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(8000) },
  );
  if (!response.ok) throw new HttpError(502, "Google Calendar could not be read.");
  const body = (await response.json()) as {
    items?: {
      id: string;
      status?: string;
      summary?: string;
      start?: { date?: string; dateTime?: string };
      end?: { date?: string; dateTime?: string };
    }[];
  };
  const events: CalendarEvent[] = [];
  for (const item of body.items ?? []) {
    if (item.status === "cancelled") continue;
    const allDay = Boolean(item.start?.date);
    const startRaw = item.start?.date ?? item.start?.dateTime;
    if (!startRaw) continue;
    const date = startRaw.slice(0, 10);
    if (date < from || date > through) continue;
    events.push({
      id: item.id,
      title: item.summary?.trim() || "(Tanpa judul)",
      date,
      start: allDay ? null : (item.start?.dateTime ?? null),
      end: allDay ? null : (item.end?.dateTime ?? null),
      allDay,
    });
  }
  return events;
}

/**
 * Revokes the Google grant behind the current session. Weekflow keeps no
 * calendar data of its own, so this is all "disconnect" has to do.
 */
export async function disconnectCalendar(ctx: Ctx) {
  const token = await googleToken(ctx);
  if (token) {
    const response = await fetch("https://oauth2.googleapis.com/revoke", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ token }),
      signal: AbortSignal.timeout(5000),
    }).catch(() => null);
    // 400 means Google already considers the token revoked or invalid.
    if (!response || (!response.ok && response.status !== 400))
      throw new HttpError(502, "Google Calendar could not be disconnected.");
  }
  return { connected: false };
}

/* ---- Task -> Google Calendar sync ------------------------------------ */

const EVENTS = "https://www.googleapis.com/calendar/v3/calendars/primary/events";

/**
 * Google lets the client choose an event id (base32hex: 0-9, a-v), so the id is
 * derived from the task id. That links task and event without storing anything
 * extra in the tasks table.
 */
const eventId = (taskId: string) =>
  `wf${createHash("sha1").update(taskId).digest("hex")}`;

export type SyncTask = {
  id: string;
  title: string;
  scheduledDate: string | null;
  completed: boolean;
  priority?: string;
  description?: string;
};

export type CalendarSync = {
  upsert: (task: SyncTask) => Promise<void>;
  remove: (taskId: string) => Promise<void>;
};

/**
 * Null when the session is not a Google one. Sync is best-effort: no method of
 * the returned object throws, so a Google outage never fails a task change.
 */
export async function prepareCalendarSync(): Promise<CalendarSync | null> {
  let token: string | null = null;
  try {
    const session = await getAppwriteHelpers().createSessionClient();
    if (session) token = await googleToken({ session });
  } catch {}
  if (!token) return null;
  const headers = {
    Authorization: `Bearer ${token}`,
    "content-type": "application/json",
  };
  const call = async (url: string, init: RequestInit) => {
    try {
      const response = await fetch(url, {
        ...init,
        headers,
        signal: AbortSignal.timeout(8000),
      });
      if (!response.ok && ![404, 410].includes(response.status))
        console.error("calendar sync", init.method, response.status);
      return response.status;
    } catch (error) {
      console.error("calendar sync", (error as Error).message);
      return 0;
    }
  };
  const remove = async (taskId: string) => {
    await call(`${EVENTS}/${eventId(taskId)}`, { method: "DELETE" });
  };
  return {
    remove,
    async upsert(task) {
      if (!task.scheduledDate) return remove(task.id);
      const next = new Date(`${task.scheduledDate}T00:00:00Z`);
      next.setUTCDate(next.getUTCDate() + 1);
      const body = {
        summary: `${task.completed ? "✓ " : ""}${task.title}`,
        description: [task.description, task.priority === "high" ? "Prioritas tinggi" : "", "Dibuat dari Weekflow"].filter(Boolean).join("\n\n"),
        start: { date: task.scheduledDate },
        end: { date: next.toISOString().slice(0, 10) },
        status: "confirmed",
        extendedProperties: { private: { weekflowTaskId: task.id } },
      };
      const id = eventId(task.id);
      const status = await call(`${EVENTS}/${id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
      if (status === 404)
        await call(EVENTS, { method: "POST", body: JSON.stringify({ ...body, id }) });
    },
  };
}
