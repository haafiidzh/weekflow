// Demo data for screenshots: realistic tasks across the current month.
// Idempotent: rows use fixed ids (`demo_YYYYMM_NN`), so re-running updates them.
//   node --env-file=.env.local scripts/seed-demo-data.mjs            seed
//   node --env-file=.env.local scripts/seed-demo-data.mjs --clear    remove the demo rows
//   add --user <userId> when the project has more than one user.
import { Client, Permission, Role, TablesDB, Users } from "node-appwrite";

const e = process.env;
const client = new Client()
  .setEndpoint(e.NEXT_PUBLIC_APPWRITE_ENDPOINT)
  .setProject(e.NEXT_PUBLIC_APPWRITE_PROJECT_ID)
  .setKey(e.APPWRITE_API_KEY);
const db = new TablesDB(client);
const base = { databaseId: e.APPWRITE_DATABASE_ID, tableId: e.APPWRITE_TASKS_TABLE_ID };

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const option = (name) => args[args.indexOf(name) + 1];

let userId = option("--user");
if (!userId) {
  const { users } = await new Users(client).list();
  if (users.length !== 1) {
    console.error("Pass --user <id>. Users:", users.map((u) => `${u.$id} ${u.name}`).join(", "));
    process.exit(1);
  }
  userId = users[0].$id;
}

const now = new Date();
const year = now.getFullYear();
const month = now.getMonth();
const today = now.getDate();
const daysInMonth = new Date(year, month + 1, 0).getDate();
const pad = (n) => String(n).padStart(2, "0");
const dateKey = (day) => `${year}-${pad(month + 1)}-${pad(day)}`;
const rowId = (n) => `demo_${year}${pad(month + 1)}_${pad(n)}`;

// [title, priority, description, note]
const pool = [
  ["Plan the week ahead", "high", "Review goals, block focus time and list the three outcomes that matter.", ""],
  ["Reply to client emails", "medium", "", ""],
  ["Write the project proposal", "high", "Scope, timeline and a simple price breakdown.", "Keep it to two pages."],
  ["Review pull requests", "medium", "", ""],
  ["Gym session", "low", "", ""],
  ["Prepare slides for Friday demo", "high", "Five slides: problem, approach, demo, results, next steps.", ""],
  ["Grocery shopping", "low", "", ""],
  ["Read two chapters", "low", "", "Currently on chapter 6."],
  ["Update portfolio case study", "medium", "Add the new screenshots and a short summary of the outcome.", ""],
  ["Fix the login redirect bug", "high", "Redirect loops when the session cookie is expired.", "Repro: sign out in another tab, then refresh."],
  ["Book dentist appointment", "low", "", ""],
  ["Weekly team sync", "medium", "", ""],
  ["Draft the newsletter", "medium", "", ""],
  ["Pay electricity bill", "high", "", ""],
  ["Refactor the settings page", "medium", "Split into smaller components and remove dead styles.", ""],
  ["Call mom", "low", "", ""],
  ["Clean up the inbox", "low", "", ""],
  ["Design review with the team", "medium", "", ""],
  ["Write unit tests for the API", "high", "Cover task create, update and the streak endpoint.", ""],
  ["Meal prep for the week", "low", "", ""],
  ["Learn a new keyboard shortcut a day", "low", "", ""],
  ["Record a short walkthrough video", "medium", "", ""],
  ["Submit the expense report", "high", "", "Receipts are in the shared folder."],
  ["Plan next sprint", "medium", "", ""],
  ["Water the plants", "low", "", ""],
  ["Backup photos", "low", "", ""],
  ["Interview prep", "high", "Practice two system design questions out loud.", ""],
  ["Sketch ideas for the landing page", "medium", "", ""],
];
const backlog = [
  ["Research a standing desk", "low", "", ""],
  ["Organise old documents", "low", "", ""],
  ["Ideas for a side project", "medium", "Jot down three ideas and pick one to prototype.", ""],
  ["Plan a weekend trip", "medium", "", ""],
];

// Days with no finished task, so the streak calendar shows real gaps.
const gaps = new Set([4, 14]);
// Past days get 3-4 tasks, today a mix, upcoming days 2-4. Weekends stay light.
const weekday = (day) => new Date(year, month, day).getDay();
const countFor = (day) => {
  const weekend = weekday(day) === 0 || weekday(day) === 6;
  if (day === today) return 5;
  if (gaps.has(day)) return 2;
  return weekend ? 2 : 3 + (day % 2);
};

const rows = [];
let n = 0;
let cursor = 0;
for (let day = 1; day <= daysInMonth; day += 1) {
  const count = countFor(day);
  for (let i = 0; i < count; i += 1) {
    const [title, priority, description, note] = pool[cursor % pool.length];
    cursor += 1;
    let completed;
    if (day < today) completed = !gaps.has(day) && !(i === count - 1 && day % 5 === 0); // a few left over
    else if (day === today) completed = i < 2; // 2 of 5 done today
    else completed = false;
    rows.push({
      id: rowId((n += 1)),
      data: {
        userId,
        title,
        scheduledDate: dateKey(day),
        completed,
        position: (i + 1) * 1024,
        priority,
        description,
        note,
        completedDay: completed ? dateKey(day) : "",
      },
    });
  }
}
backlog.forEach(([title, priority, description, note], i) => {
  rows.push({
    id: rowId((n += 1)),
    data: { userId, title, scheduledDate: "", completed: false, position: (i + 1) * 1024, priority, description, note, completedDay: "" },
  });
});

const owner = Role.user(userId);
const permissions = [Permission.read(owner), Permission.update(owner), Permission.delete(owner)];

if (flag("--clear")) {
  let removed = 0;
  for (const row of rows) {
    try {
      await db.deleteRow({ ...base, rowId: row.id });
      removed += 1;
    } catch (error) {
      if (error?.code !== 404) throw error;
    }
  }
  console.log("removed", removed);
} else {
  let created = 0;
  let updated = 0;
  for (const row of rows) {
    try {
      await db.createRow({ ...base, rowId: row.id, data: row.data, permissions });
      created += 1;
    } catch (error) {
      if (error?.code !== 409) throw error;
      await db.updateRow({ ...base, rowId: row.id, data: row.data });
      updated += 1;
    }
  }
  const done = rows.filter((r) => r.data.completed).length;
  console.log(`user ${userId}: ${created} created, ${updated} updated, ${done}/${rows.length} completed`);
}
