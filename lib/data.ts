export type Task = {
  id: string;
  title: string;
  scheduledDate: string | null;
  completed: boolean;
  position: number;
};

const keyFor = (email: string) =>
  `weekflow-preview-tasks:${email.trim().toLowerCase()}`;
const currentDay = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

function read(email: string): Task[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(keyFor(email)) || "[]");
    if (!Array.isArray(value)) throw new Error("Task storage must be a list.");
    return value as Task[];
  } catch {
    throw new Error("Data lokal tidak dapat dibaca.");
  }
}

function write(email: string, tasks: Task[]) {
  try {
    localStorage.setItem(keyFor(email), JSON.stringify(tasks));
  } catch {
    throw new Error(
      "Penyimpanan browser penuh. Hapus beberapa tugas lalu coba lagi.",
    );
  }
}

export function listTasks(
  email: string,
  from?: string,
  through?: string,
): Task[] {
  return read(email).filter((task) => {
    if (!from || !through) return true;
    return (
      task.scheduledDate !== null &&
      task.scheduledDate >= from &&
      task.scheduledDate <= through
    );
  });
}

export function createTask(
  email: string,
  title: string,
  scheduledDate: string | null,
): Task {
  const tasks = read(email);
  const inList = tasks.filter((task) => task.scheduledDate === scheduledDate);
  const task: Task = {
    id: globalThis.crypto?.randomUUID?.() ?? `task-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    title: title.trim(),
    scheduledDate,
    completed: false,
    position: Math.max(0, ...inList.map((item) => item.position)) + 1024,
  };
  if (!task.title || task.title.length > 200)
    throw new Error("Judul tugas harus berisi 1 sampai 200 karakter.");
  write(email, [...tasks, task]);
  return task;
}

export function updateTask(
  email: string,
  id: string,
  title: string,
  scheduledDate: string | null,
): Task {
  const tasks = read(email);
  const current = tasks.find((task) => task.id === id);
  if (!current) throw new Error("Tugas ini sudah tidak tersedia.");
  const cleanTitle = title.trim();
  if (!cleanTitle || cleanTitle.length > 200)
    throw new Error("Judul tugas harus berisi 1 sampai 200 karakter.");
  const changedList = current.scheduledDate !== scheduledDate;
  const position = changedList
    ? Math.max(
        0,
        ...tasks
          .filter(
            (task) => task.scheduledDate === scheduledDate && task.id !== id,
          )
          .map((task) => task.position),
      ) + 1024
    : current.position;
  const next = { ...current, title: cleanTitle, scheduledDate, position };
  write(
    email,
    tasks.map((task) => (task.id === id ? next : task)),
  );
  return next;
}

export function deleteTask(email: string, id: string) {
  const tasks = read(email);
  write(
    email,
    tasks.filter((task) => task.id !== id),
  );
}

export function moveTask(
  email: string,
  id: string,
  scheduledDate: string | null,
): Task {
  const tasks = read(email);
  const current = tasks.find((task) => task.id === id);
  if (!current) throw new Error("Tugas ini sudah tidak tersedia.");
  const position =
    Math.max(
      0,
      ...tasks
        .filter(
          (task) => task.scheduledDate === scheduledDate && task.id !== id,
        )
        .map((task) => task.position),
    ) + 1024;
  const next = { ...current, scheduledDate, position };
  write(
    email,
    tasks.map((task) => (task.id === id ? next : task)),
  );
  return next;
}

export function reorderTask(email: string, id: string, direction: -1 | 1) {
  const tasks = read(email);
  const current = tasks.find((task) => task.id === id);
  if (!current) throw new Error("Tugas ini sudah tidak tersedia.");
  const list = tasks
    .filter((task) => task.scheduledDate === current.scheduledDate)
    .sort((a, b) => a.position - b.position);
  const index = list.findIndex((task) => task.id === id);
  const other = list[index + direction];
  if (!other) return;
  const oldPosition = current.position;
  write(
    email,
    tasks.map((task) =>
      task.id === current.id
        ? { ...task, position: other.position }
        : task.id === other.id
          ? { ...task, position: oldPosition }
          : task,
    ),
  );
}

export function setTaskCompletion(
  email: string,
  id: string,
  completed: boolean,
) {
  const tasks = read(email);
  if (!tasks.some((task) => task.id === id))
    throw new Error("Tugas ini sudah tidak tersedia.");
  write(
    email,
    tasks.map((task) => (task.id === id ? { ...task, completed } : task)),
  );
}

export function seedPreviewTasks(email: string) {
  const storageKey = keyFor(email);
  if (localStorage.getItem(storageKey)) return;
  const [year, month, day] = currentDay().split("-").map(Number);
  const today = new Date(year, month - 1, day);
  const monday = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate() - ((today.getDay() + 6) % 7),
  );
  const format = (date: Date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  write(email, [
    {
      id: crypto.randomUUID(),
      title: "Pilih satu hal yang paling penting",
      scheduledDate: format(today),
      completed: false,
      position: 1024,
    },
    {
      id: crypto.randomUUID(),
      title: "Beri jeda di antara rencana",
      scheduledDate: format(
        new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 2),
      ),
      completed: false,
      position: 1024,
    },
    {
      id: crypto.randomUUID(),
      title: "Catat ide untuk minggu depan",
      scheduledDate: null,
      completed: false,
      position: 1024,
    },
  ]);
}
