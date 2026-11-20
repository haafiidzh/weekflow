"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ComponentType } from "react";
import {
  FaArrowDown,
  FaArrowRight,
  FaArrowUp,
  FaCheck,
  FaFire,
  FaInbox,
  FaRegClock,
} from "react-icons/fa";
import { listTasks, listUnscheduledTasks, type Task } from "@/lib/data";

const MODES = ["week", "last", "7", "1m", "3m", "6m", "custom"] as const;
type Mode = (typeof MODES)[number];
const MODE_LABEL: Record<Mode, [string, string]> = {
  week: ["Minggu ini", "This week"],
  last: ["Minggu lalu", "Last week"],
  "7": ["7 hari", "7 days"],
  "1m": ["1 bulan", "1 month"],
  "3m": ["3 bulan", "3 months"],
  "6m": ["6 bulan", "6 months"],
  custom: ["Kustom", "Custom"],
};
const MAX_DAYS = 366;

export type DateField = ComponentType<{
  value: string;
  onChange: (value: string) => void;
  label: string;
  id?: string;
  clearable?: boolean;
}>;

const english = () => {
  try {
    return window.localStorage.getItem("weekflow-language") === "en";
  } catch {
    return false;
  }
};
const t = (id: string, en: string) => (english() ? en : id);
const label = (date: Date, options: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat(english() ? "en-US" : "id-ID", options).format(date);

const keyOf = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const fromKey = (key: string) => {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day);
};
const shift = (date: Date, days: number) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
const daysBetween = (from: string, to: string) =>
  Math.round((fromKey(to).getTime() - fromKey(from).getTime()) / 86_400_000);
const monday = (date: Date, weekStarts: number) =>
  shift(date, -((date.getDay() - weekStarts + 7) % 7));
const span = (start: Date, length: number) =>
  Array.from({ length }, (_, i) => keyOf(shift(start, i)));

type Day = { key: string; planned: number; done: number };
/** A chart bar: one day for short periods, one week for long ones. */
type Group = { start: string; end: string; planned: number; done: number };

function bucket(tasks: Task[], keys: string[]): Day[] {
  const days = new Map(keys.map((key) => [key, { key, planned: 0, done: 0 }]));
  for (const task of tasks) {
    const day = task.scheduledDate ? days.get(task.scheduledDate) : undefined;
    if (!day) continue;
    day.planned += 1;
    if (task.completed) day.done += 1;
  }
  return keys.map((key) => days.get(key)!);
}

const sum = (days: { planned: number; done: number }[], field: "planned" | "done") =>
  days.reduce((total, day) => total + day[field], 0);
const percent = (done: number, planned: number) =>
  planned ? Math.round((done / planned) * 100) : 0;

/** Day keys of a period, oldest first. */
export function periodKeys(
  mode: Mode,
  weekStarts: number,
  custom: { from: string; to: string },
  now = new Date(),
): string[] {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  switch (mode) {
    case "week":
      return span(monday(today, weekStarts), 7);
    case "last":
      return span(shift(monday(today, weekStarts), -7), 7);
    case "7":
      return span(shift(today, -6), 7);
    case "custom": {
      const length = daysBetween(custom.from, custom.to) + 1;
      return length >= 1 && length <= MAX_DAYS ? span(fromKey(custom.from), length) : [];
    }
    default: {
      // Calendar months back from today, counting today as the last day.
      const months = Number.parseInt(mode, 10);
      const start = new Date(today.getFullYear(), today.getMonth() - months, today.getDate());
      // Clamp (e.g. 31 Mar - 1 month) instead of spilling into the next month.
      if (start.getDate() !== today.getDate()) start.setDate(0);
      return span(shift(start, 1), daysBetween(keyOf(start), keyOf(today)));
    }
  }
}

function groupDays(days: Day[], weekStarts: number): Group[] {
  if (days.length <= 31)
    return days.map((day) => ({ start: day.key, end: day.key, planned: day.planned, done: day.done }));
  const groups: Group[] = [];
  for (const day of days) {
    const startsWeek = fromKey(day.key).getDay() === weekStarts;
    const last = groups[groups.length - 1];
    if (!last || startsWeek)
      groups.push({ start: day.key, end: day.key, planned: 0, done: 0 });
    const group = groups[groups.length - 1];
    group.end = day.key;
    group.planned += day.planned;
    group.done += day.done;
  }
  return groups;
}

export function computeStats(
  tasks: Task[],
  keys: string[],
  previousKeys: string[],
  today: string,
  weekStarts = 1,
) {
  const current = bucket(tasks, keys);
  const previous = bucket(tasks, previousKeys);
  const planned = sum(current, "planned");
  const done = sum(current, "done");
  const rate = percent(done, planned);
  const previousPlanned = sum(previous, "planned");
  const overdue = current.reduce(
    (total, day) => total + (day.key < today ? day.planned - day.done : 0),
    0,
  );
  const todayRow = current.find((day) => day.key === today);
  // Streak: consecutive days with a finished task up to today (or yesterday
  // while today has nothing finished yet). Future days are ignored.
  const past = current.filter((day) => day.key <= today);
  let streak = 0;
  for (let i = past.length - 1; i >= 0; i -= 1) {
    if (past[i].done > 0) streak += 1;
    else if (past[i].key === today) continue;
    else break;
  }
  const best = current.reduce(
    (top, day) => (day.done > top.done ? day : top),
    { key: "", planned: 0, done: 0 },
  );
  const groups = groupDays(current, weekStarts);
  return {
    current,
    groups,
    planned,
    done,
    rate,
    delta: rate - percent(sum(previous, "done"), previousPlanned),
    hasBefore: previousPlanned > 0,
    overdue,
    left: todayRow ? todayRow.planned - todayRow.done : 0,
    streak,
    best: best.done > 0 ? best : null,
    peak: Math.max(1, ...groups.map((group) => group.planned)),
  };
}
type Stats = ReturnType<typeof computeStats>;

const groupName = (group: Group, long = false) => {
  const day = (key: string) =>
    label(fromKey(key), long ? { day: "numeric", month: "short" } : { day: "numeric", month: "short" });
  return group.start === group.end
    ? label(fromKey(group.start), { weekday: "long", day: "numeric", month: "short" })
    : `${day(group.start)} – ${day(group.end)}`;
};

function Bars({
  stats,
  today,
  compact = false,
}: {
  stats: Stats;
  today: string;
  compact?: boolean;
}) {
  const daily = stats.groups.length <= 31 && stats.groups[0]?.start === stats.groups[0]?.end;
  const count = stats.groups.length;
  const every = count <= 14 ? 1 : Math.ceil(count / 7);
  return (
    <div
      className={`analytics-bars${compact ? " is-compact" : ""}${count > 14 ? " is-dense" : ""}`}
      role="img"
      aria-label={t("Grafik tugas selesai", "Chart of tasks done")}
      style={{ ["--cols" as string]: count }}
    >
      {stats.groups.map((group, index) => {
        const total = (group.planned / stats.peak) * 100;
        const filled = group.planned ? (group.done / group.planned) * 100 : 0;
        const isToday = today >= group.start && today <= group.end;
        return (
          <div
            key={group.start}
            className={`analytics-col${isToday ? " is-today" : ""}`}
            title={`${groupName(group)}: ${group.done}/${group.planned}`}
          >
            <div className="analytics-track">
              <span
                className="analytics-pill"
                style={{ height: `${Math.max(total, group.planned ? 8 : 0)}%` }}
              >
                <i style={{ height: `${filled}%` }} />
              </span>
            </div>
            <span className="analytics-day">
              {index % every === 0
                ? daily
                  ? label(fromKey(group.start), {
                      weekday: compact || count > 7 ? "narrow" : "short",
                      ...(count > 14 ? { day: "numeric" } : {}),
                    })
                  : label(fromKey(group.start), { day: "numeric", month: "short" })
                : ""}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/** Compact summary of the week shown on the planner, built from its tasks. */
export function AnalyticsPeek({
  tasks,
  keys,
  loaded,
}: {
  tasks: Task[];
  keys: string[];
  loaded: boolean;
}) {
  const today = keyOf(new Date());
  const stats = useMemo(
    () => computeStats(tasks, keys, [], today),
    [tasks, keys, today],
  );
  return (
    <section className="analytics-peek" aria-label="Ringkasan analitik">
      <div className="analytics-peek-copy">
        <div className="eyebrow">
          <span className="eyebrow-line" />
          {t("ANALITIK MINGGU INI", "THIS WEEK'S ANALYTICS")}
        </div>
        <h2>{t("Seberapa jauh minggumu?", "How is your week going?")}</h2>
        <div className="analytics-peek-numbers" aria-busy={!loaded}>
          <strong>
            {loaded ? stats.rate : "–"}
            <small>%</small>
          </strong>
          <span>
            {loaded
              ? `${stats.done} ${t("dari", "of")} ${stats.planned} ${t("tugas selesai", "tasks done")}`
              : t("Memuat…", "Loading…")}
            {loaded && stats.overdue > 0 && (
              <>
                {" · "}
                {stats.overdue} {t("terlewat", "overdue")}
              </>
            )}
          </span>
        </div>
        <Link className="button button-primary" href="/analytics">
          {t("Lihat analitik", "View analytics")}
          <FaArrowRight aria-hidden="true" />
        </Link>
      </div>
      <Bars stats={stats} today={today} compact />
    </section>
  );
}

export function AnalyticsBoard({
  weekStarts,
  DateField,
}: {
  weekStarts: number;
  DateField: DateField;
}) {
  const todayKey = useMemo(() => keyOf(new Date()), []);
  const [mode, setMode] = useState<Mode>("week");
  const [custom, setCustom] = useState(() => ({
    from: keyOf(shift(fromKey(todayKey), -29)),
    to: todayKey,
  }));
  const [tasks, setTasks] = useState<Task[] | null>(null);
  const [backlog, setBacklog] = useState(0);
  const [error, setError] = useState(false);
  const [reload, setReload] = useState(0);

  const keys = useMemo(
    () => periodKeys(mode, weekStarts, custom),
    [mode, weekStarts, custom],
  );
  const previousKeys = useMemo(
    () => keys.map((key) => keyOf(shift(fromKey(key), -keys.length))),
    [keys],
  );
  const customProblem =
    mode !== "custom" || keys.length > 0
      ? ""
      : !custom.from || !custom.to
        ? t("Pilih tanggal mulai dan akhir.", "Choose a start and an end date.")
        : custom.to < custom.from
          ? t("Tanggal akhir harus setelah tanggal mulai.", "The end date must be after the start date.")
          : t(
              `Rentang maksimal ${MAX_DAYS} hari.`,
              `The range can be at most ${MAX_DAYS} days.`,
            );

  // One request covers the period and the equally long one before it.
  useEffect(() => {
    if (keys.length === 0) return;
    let cancelled = false;
    setTasks(null);
    setError(false);
    Promise.all([
      listTasks(previousKeys[0], keys[keys.length - 1]),
      listUnscheduledTasks(),
    ])
      .then(([scheduled, unscheduled]) => {
        if (cancelled) return;
        setTasks(scheduled);
        setBacklog(unscheduled.filter((task) => !task.completed).length);
      })
      .catch(() => !cancelled && setError(true));
    return () => {
      cancelled = true;
    };
  }, [keys, previousKeys, reload]);

  const stats = useMemo(
    () =>
      tasks && keys.length
        ? computeStats(tasks, keys, previousKeys, todayKey, weekStarts)
        : null,
    [tasks, keys, previousKeys, todayKey, weekStarts],
  );
  const long = keys.length > 7;

  return (
    <div className="analytics">
      <div className="analytics-tabs" role="tablist" aria-label="Rentang waktu">
        {MODES.map((value) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={mode === value}
            className={mode === value ? "is-active" : ""}
            onClick={() => setMode(value)}
          >
            {t(...MODE_LABEL[value])}
          </button>
        ))}
      </div>

      {mode === "custom" && (
        <div className="analytics-custom">
          <label>
            <span>{t("Dari", "From")}</span>
            <DateField
              value={custom.from}
              label={t("Tanggal mulai", "Start date")}
              onChange={(from) => setCustom((c) => ({ ...c, from }))}
            />
          </label>
          <label>
            <span>{t("Sampai", "To")}</span>
            <DateField
              value={custom.to}
              label={t("Tanggal akhir", "End date")}
              onChange={(to) => setCustom((c) => ({ ...c, to }))}
            />
          </label>
          {customProblem && (
            <p className="form-error" role="alert">
              {customProblem}
            </p>
          )}
        </div>
      )}

      {error && (
        <div className="analytics-card analytics-state" role="alert">
          <p>{t("Analitik belum bisa dimuat.", "Analytics could not load.")}</p>
          <button
            type="button"
            className="button button-soft"
            onClick={() => setReload((n) => n + 1)}
          >
            {t("Coba lagi", "Try again")}
          </button>
        </div>
      )}

      {!error && !stats && !customProblem && (
        <div className="analytics-grid" aria-busy="true">
          <div className="analytics-card analytics-hero skeleton" />
          <div className="analytics-card analytics-days skeleton" />
        </div>
      )}

      {stats && !error && (
        <>
          <div className="analytics-grid">
            <section className="analytics-card analytics-hero" aria-label="Progres">
              <header>
                <h2>{t("Progres tugas", "Task progress")}</h2>
                <span className="analytics-range">
                  {label(fromKey(keys[0]), { day: "numeric", month: "short", year: long ? "numeric" : undefined })}
                  {" – "}
                  {label(fromKey(keys[keys.length - 1]), { day: "numeric", month: "short", year: long ? "numeric" : undefined })}
                </span>
              </header>
              <div className="analytics-hero-body">
                <div className="analytics-figure">
                  {stats.hasBefore && (
                    <span
                      className={`analytics-chip${stats.delta < 0 ? " is-down" : ""}`}
                    >
                      {stats.delta < 0 ? (
                        <FaArrowDown aria-hidden="true" />
                      ) : (
                        <FaArrowUp aria-hidden="true" />
                      )}
                      {Math.abs(stats.delta)}%{" "}
                      {t("dari periode lalu", "vs previous period")}
                    </span>
                  )}
                  <div className="analytics-number">
                    {stats.rate}
                    <small>%</small>
                  </div>
                  <p>
                    {stats.done} {t("dari", "of")} {stats.planned}{" "}
                    {t("tugas selesai", "tasks done")}
                  </p>
                </div>
                <Bars stats={stats} today={todayKey} />
              </div>
              <ul className="analytics-legend">
                <li>
                  <i className="swatch swatch-plan" />
                  {t("Direncanakan", "Planned")}
                </li>
                <li>
                  <i className="swatch swatch-done" />
                  {t("Selesai", "Done")}
                </li>
                {stats.groups.length > 0 && stats.groups[0].start !== stats.groups[0].end && (
                  <li>{t("Satu batang = satu minggu", "One bar = one week")}</li>
                )}
              </ul>
              {stats.planned === 0 && (
                <p className="analytics-empty">
                  {t(
                    "Belum ada tugas bertanggal pada periode ini. Tambahkan di planner.",
                    "No dated tasks in this period yet. Add some in the planner.",
                  )}
                </p>
              )}
            </section>

            <section className="analytics-card analytics-days" aria-label="Rincian">
              <header>
                <h2>
                  {stats.groups[0]?.start === stats.groups[0]?.end
                    ? t("Rincian harian", "Daily breakdown")
                    : t("Rincian mingguan", "Weekly breakdown")}
                </h2>
              </header>
              <ul>
                {[...stats.groups].reverse().map((group) => {
                  const pct = percent(group.done, group.planned);
                  const isToday = todayKey >= group.start && todayKey <= group.end;
                  return (
                    <li key={group.start} className={isToday ? "is-today" : ""}>
                      <span className="analytics-row-day">
                        {group.start === group.end
                          ? label(fromKey(group.start), {
                              weekday: "short",
                              day: "numeric",
                              month: "short",
                            })
                          : groupName(group)}
                      </span>
                      <span
                        className="analytics-meter"
                        role="progressbar"
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={pct}
                      >
                        <i style={{ width: `${pct}%` }} />
                      </span>
                      <span className="analytics-row-count">
                        {group.planned ? `${group.done}/${group.planned}` : "–"}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </section>
          </div>

          <div className="analytics-stats">
            <div className="analytics-card analytics-stat">
              <span className="analytics-icon">
                <FaCheck aria-hidden="true" />
              </span>
              <h3>{t("Selesai", "Completed")}</h3>
              <strong>{stats.done}</strong>
              <p>
                {stats.best
                  ? `${t("Terbaik", "Best")}: ${label(fromKey(stats.best.key), { weekday: "long", ...(long ? { day: "numeric", month: "short" } : {}) })} (${stats.best.done})`
                  : t("Belum ada yang selesai", "Nothing finished yet")}
              </p>
            </div>
            <div className="analytics-card analytics-stat">
              <span className="analytics-icon">
                <FaRegClock aria-hidden="true" />
              </span>
              <h3>{t("Terlewat", "Overdue")}</h3>
              <strong>{stats.overdue}</strong>
              <p>
                {stats.left > 0
                  ? `${stats.left} ${t("tersisa hari ini", "left today")}`
                  : t("Hari ini beres", "Today is clear")}
              </p>
            </div>
            <div className="analytics-card analytics-stat">
              <span className="analytics-icon">
                <FaFire aria-hidden="true" />
              </span>
              <h3>{t("Beruntun", "Streak")}</h3>
              <strong>
                {stats.streak}
                <small> {t("hari", stats.streak === 1 ? "day" : "days")}</small>
              </strong>
              <p>{t("Hari berturut-turut ada tugas selesai", "Days in a row with a finished task")}</p>
            </div>
            <div className="analytics-card analytics-stat">
              <span className="analytics-icon">
                <FaInbox aria-hidden="true" />
              </span>
              <h3>{t("Tanpa tanggal", "Unscheduled")}</h3>
              <strong>{backlog}</strong>
              <p>{t("Tugas menunggu dijadwalkan", "Tasks waiting for a day")}</p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
