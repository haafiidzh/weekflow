// One-off, idempotent: add priority / description / note columns to the tasks table.
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
