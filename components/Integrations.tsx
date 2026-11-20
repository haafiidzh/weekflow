"use client";

import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { FaSearch, FaTimes } from "react-icons/fa";
import { SiGooglecalendar } from "react-icons/si";
import { OAuthProvider, useAuth } from "@appwrite.io/react";
import { disconnectCalendar, getCalendarStatus } from "@/lib/data";
import { ModalFrame, useModalClose } from "./Modal";

const CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar.events";

type Category = "calendar" | "tasks" | "chat";

type Integration = {
  id: string;
  name: string;
  description: string;
  action: string;
  category: Category;
  /** Brand colour of the app, used for the icon only. */
  color: string;
  icon: ReactNode;
  /** Only Google Calendar is being prepared first; the rest are placeholders. */
  available: boolean;
};

export const INTEGRATIONS: Integration[] = [
  {
    id: "google-calendar",
    name: "Google Calendar",
    description:
      "Tugas yang punya tanggal otomatis muncul di Google Calendar sebagai acara sehari penuh.",
    action: "Hubungkan akun Google",
    category: "calendar",
    color: "#4285f4",
    icon: <SiGooglecalendar aria-hidden="true" />,
    available: true,
  },
];

const CATEGORIES: { id: "all" | Category; label: string }[] = [
  { id: "all", label: "Semua" },
  { id: "calendar", label: "Kalender" },
  { id: "tasks", label: "Tugas" },
  { id: "chat", label: "Komunikasi" },
];

function IconTile({ item, size = "md" }: { item: Integration; size?: "sm" | "md" }) {
  return (
    <span
      className={`integration-icon is-${size}`}
      style={{ color: item.color }}
      aria-hidden="true"
    >
      {item.icon}
    </span>
  );
}

export function IntegrationsRow({ onOpen }: { onOpen: () => void }) {
  // Overlapped like an avatar stack; grows as integrations are added.
  const stack = INTEGRATIONS;
  return (
    <div className="settings-row">
      <div>
        <h2>Integrasi</h2>
      </div>
      <button type="button" className="button button-primary integrate-button" onClick={onOpen}>
        <span className="integrate-stack" aria-hidden="true">
          {stack.map((item) => (
            <IconTile key={item.id} item={item} size="sm" />
          ))}
        </span>
        <span>Integrasikan</span>
      </button>
    </div>
  );
}

export function IntegrationsDialog({ onClose }: { onClose: () => void }) {
  const { closing, close } = useModalClose(onClose);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<"all" | Category>("all");
  const titleId = useId();
  const search = useRef<HTMLInputElement | null>(null);
  const { signIn } = useAuth();
  // null while checking, so the card never flashes a wrong state.
  const [calendar, setCalendar] = useState<boolean | null>(null);
  const [calendarError, setCalendarError] = useState("");

  useEffect(() => {
    let live = true;
    getCalendarStatus()
      .then((connected) => live && setCalendar(connected))
      .catch(() => live && setCalendar(false));
    return () => {
      live = false;
    };
  }, []);

  const [calendarBusy, setCalendarBusy] = useState(false);
  const disconnect = async () => {
    setCalendarError("");
    setCalendarBusy(true);
    try {
      await disconnectCalendar();
      setCalendar(false);
    } catch {
      setCalendarError("Google Calendar belum bisa diputuskan. Coba lagi.");
    } finally {
      setCalendarBusy(false);
    }
  };

  const connectCalendar = () => {
    setCalendarError("");
    signIn.oAuth({
      provider: OAuthProvider.Google,
      scopes: [CALENDAR_SCOPE],
      onError: () => setCalendarError("Google Calendar belum bisa dihubungkan. Coba lagi."),
    });
  };

  useEffect(() => {
    search.current?.focus({ preventScroll: true });
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [close]);

  const shown = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return INTEGRATIONS.filter(
      (item) =>
        (category === "all" || item.category === category) &&
        (!needle ||
          item.name.toLowerCase().includes(needle) ||
          item.description.toLowerCase().includes(needle)),
    );
  }, [query, category]);

  return (
    <ModalFrame closing={closing} onBackdrop={close}>
      <section
        className="task-dialog integrations-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <button type="button" className="dialog-close" aria-label="Tutup" onClick={close}>
          <FaTimes aria-hidden="true" />
        </button>
        <div className="dialog-kicker">INTEGRASI</div>
        <h2 id={titleId}>Integrasi dan layanan</h2>
        <p>Hubungkan Weekflow dengan aplikasi yang sudah kamu pakai setiap hari.</p>
        <div className="integrations-toolbar">
          <label className="integrations-search">
            <FaSearch aria-hidden="true" />
            <input
              ref={search}
              type="search"
              value={query}
              placeholder="Cari integrasi…"
              aria-label="Cari integrasi"
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <div className="analytics-tabs" role="tablist" aria-label="Kategori integrasi">
            {CATEGORIES.map((item) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={category === item.id}
                className={category === item.id ? "is-active" : ""}
                onClick={() => setCategory(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
        {shown.length ? (
          <ul className="integrations-grid">
            {shown.map((item) => (
              <li key={item.id} className="integration-card">
                <IconTile item={item} />
                <h3>{item.name}</h3>
                <p>{item.description}</p>
                <div className="integration-foot">
                  <span>
                    {calendar === null
                      ? "Memeriksa…"
                      : calendar
                        ? "Terhubung ke Google"
                        : item.action}
                  </span>
                  <button
                    type="button"
                    className={`button integration-connect ${calendar ? "button-soft" : "button-primary"}`}
                    disabled={calendar === null || calendarBusy}
                    onClick={calendar ? disconnect : connectCalendar}
                  >
                    {calendar ? "Putuskan" : "Hubungkan"}
                  </button>
                </div>
                {item.id === "google-calendar" && calendarError && (
                  <p className="form-error" role="alert">
                    {calendarError}
                  </p>
                )}
              </li>
            ))}
            {!query.trim() && (
              <li className="integration-card is-soon">
                <h3>Integrasi lainnya</h3>
                <p>Aplikasi lain akan segera hadir.</p>
                <div className="integration-foot">
                  <span className="integration-state">Segera hadir</span>
                </div>
              </li>
            )}
          </ul>
        ) : (
          <p className="integrations-empty">
            {query.trim() ? "Tidak ada integrasi yang cocok." : "Integrasi untuk kategori ini segera hadir."}
          </p>
        )}
      </section>
    </ModalFrame>
  );
}
