// One-off, idempotent: add priority / description / note / completedDay columns to the tasks table.
// Also back-fills completedDay (= scheduledDate) for tasks already completed.
// Run: node --env-file=.env.local scripts/add-task-columns.mjs
import { Client, TablesDB } from "node-appwrite";

const { NEXT_PUBLIC_APPWRITE_ENDPOINT, NEXT_PUBLIC_APPWRITE_PROJECT_ID, APPWRITE_API_KEY, APPWRITE_DATABASE_ID, APPWRITE_TASKS_TABLE_ID } = process.env;
const client = new Client()
  .setEndpoint(NEXT_PUBLIC_APPWRITE_ENDPOINT)
  .setProject(NEXT_PUBLIC_APPWRITE_PROJECT_ID)
  .setKey(APPWRITE_API_KEY);
const db = new TablesDB(client);
const base = { databaseId: APPWRITE_DATABASE_ID, tableId: APPWRITE_TASKS_TABLE_ID };

const steps = [
  ["priority", () => db.createEnumColumn({ ...base, key: "priority", elements: ["low", "medium", "high"], required: false, xdefault: "medium" })],
  ["description", () => db.createTextColumn({ ...base, key: "description", required: false })],
  ["note", () => db.createTextColumn({ ...base, key: "note", required: false })],
  ["completedDay", () => db.createVarcharColumn({ ...base, key: "completedDay", size: 10, required: false })],
];
for (const [key, run] of steps) {
  try {
    await run();
    console.log("created", key);
  } catch (error) {
    if (error?.code === 409) console.log("exists", key);
    else {
      console.error("failed", key, error?.code, error?.message);
      process.exitCode = 1;
    }
  }
}

// Back-fill: best guess for old completed tasks is the day they were planned for.
if (!process.exitCode) {
  const { Query } = await import("node-appwrite");
  // Columns may take a moment to become available.
  for (let i = 0; i < 20; i += 1) {
    const cols = await db.listColumns(base);
    if (cols.columns.find((c) => c.key === "completedDay")?.status === "available") break;
    await new Promise((r) => setTimeout(r, 1000));
  }
  let filled = 0;
  for (;;) {
    const { rows } = await db.listRows({ ...base, queries: [Query.equal("completed", [true]), Query.isNull("completedDay"), Query.limit(100)] });
    const todo = rows.filter((r) => r.scheduledDate);
    if (!rows.length) break;
    for (const row of todo) {
      await db.updateRow({ ...base, rowId: row.$id, data: { completedDay: row.scheduledDate } });
      filled += 1;
    }
    if (todo.length === 0) break;
  }
  console.log("backfilled", filled);
}
