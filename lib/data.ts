export type Priority = "low" | "medium" | "high";

export type Task = {
  id: string;
  title: string;
  scheduledDate: string | null;
  completed: boolean;
  position: number;
  priority: Priority;
  description: string;
  note: string;
};

export type TaskDetails = {
  title: string;
  scheduledDate: string | null;
  priority: Priority;
  description: string;
  note: string;
};

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    // FormData needs the browser to set the multipart boundary itself.
    headers:
      init?.body instanceof FormData
        ? init.headers
        : { "content-type": "application/json", ...init?.headers },
    credentials: "same-origin",
  });
  if (!response.ok) {
    let message = "Permintaan gagal.";
    try {
      message = ((await response.json()) as { error?: string }).error ?? message;
    } catch {}
    throw new Error(message);
  }
  return (await response.json()) as T;
}

export async function listTasks(from: string, through: string): Promise<Task[]> {
  const query = new URLSearchParams({ from, through });
  return (await request<{ tasks: Task[] }>(`/api/tasks?${query}`)).tasks;
}

export async function listUnscheduledTasks(): Promise<Task[]> {
  return (await request<{ tasks: Task[] }>("/api/tasks?unscheduled=1")).tasks;
}

export async function createTask(details: TaskDetails): Promise<Task> {
  return (
    await request<{ task: Task }>("/api/tasks", {
      method: "POST",
      body: JSON.stringify(details),
    })
  ).task;
}

function patch(id: string, body: Record<string, unknown>) {
  return request<{ task: Task }>(`/api/tasks/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  }).then((result) => result.task);
}

export const updateTask = (id: string, details: TaskDetails) =>
  patch(id, { ...details });

export const setTaskPriority = (id: string, priority: Priority) =>
  patch(id, { priority });

export const moveTask = (id: string, scheduledDate: string | null) =>
  patch(id, { scheduledDate });

const localDay = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
};

export const setTaskCompletion = (id: string, completed: boolean) =>
  patch(id, { completed, completedDay: localDay() });

/** Days (YYYY-MM-DD, oldest first) on which a task was finished. */
export async function listCompletedDays(): Promise<string[]> {
  return (await request<{ days: string[] }>("/api/tasks/streak")).days;
}

export async function deleteTask(id: string): Promise<void> {
  await request(`/api/tasks/${encodeURIComponent(id)}`, { method: "DELETE" });
}

/** Swap positions with the neighbour in the same list. */
export async function reorderTask(
  current: Task,
  neighbour: Task,
): Promise<void> {
  await Promise.all([
    patch(current.id, { position: neighbour.position }),
    patch(neighbour.id, { position: current.position }),
  ]);
}

export type Profile = {
  firstName: string;
  lastName: string;
  name: string;
  avatarUrl: string | null;
};

export const MAX_AVATAR_BYTES = 2 * 1024 * 1024;

export function updateProfileNames(firstName: string, lastName: string) {
  return request<Profile>("/api/profile", {
    method: "PATCH",
    body: JSON.stringify({ firstName, lastName }),
  });
}

export function uploadAvatar(blob: Blob) {
  const form = new FormData();
  form.set("file", blob, "avatar.jpg");
  // Let the browser set the multipart boundary header.
  return request<Profile>("/api/profile/avatar", {
    method: "POST",
    body: form,
  });
}

export function deleteAvatar() {
  return request<Profile>("/api/profile/avatar", { method: "DELETE" });
}

export function syncProfile() {
  return request<Profile>("/api/profile/sync", { method: "POST" });
}

export type CalendarEvent = {
  id: string;
  title: string;
  date: string;
  start: string | null;
  end: string | null;
  allDay: boolean;
};

export async function getCalendarStatus(): Promise<boolean> {
  return (await request<{ connected: boolean }>("/api/integrations/google-calendar"))
    .connected;
}

export async function listCalendarEvents(
  from: string,
  through: string,
): Promise<CalendarEvent[]> {
  const query = new URLSearchParams({ from, through });
  return (
    await request<{ events: CalendarEvent[] }>(`/api/integrations/google-calendar?${query}`)
  ).events;
}

export async function disconnectCalendar(): Promise<void> {
  await request<{ connected: boolean }>("/api/integrations/google-calendar", {
    method: "DELETE",
  });
}
