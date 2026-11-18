"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type FormEvent } from "react";
import {
  FaArrowDown,
  FaArrowLeft,
  FaArrowRight,
  FaArrowUp,
  FaCheck,
  FaChevronDown,
  FaEllipsisH,
  FaExclamationCircle,
  FaExternalLinkAlt,
  FaPlus,
  FaRegCircle,
  FaSun,
  FaTimes,
} from "react-icons/fa";
import {
  createTask,
  deleteTask,
  listTasks,
  moveTask,
  reorderTask,
  setTaskCompletion,
  updateTask,
  type Task,
} from "@/lib/data";
import {
  getSession,
  signIn,
  signOut,
  signUp,
  type LocalSession,
} from "@/lib/auth";

const dayKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const fromKey = (key: string) => {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day);
};
const shift = (date: Date, days: number) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
const mondayOf = (date: Date, weekStarts = 1) => {
  const result = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const offset = (result.getDay() - weekStarts + 7) % 7;
  result.setDate(result.getDate() - offset);
  return result;
};
const dateLabel = (date: Date, options: Intl.DateTimeFormatOptions) => {
  const locale =
    typeof window !== "undefined" &&
    window.localStorage.getItem("weekflow-language") === "en"
      ? "en-US"
      : "id-ID";
  return new Intl.DateTimeFormat(locale, options).format(date);
};
const todayKey = dayKey(new Date());

const translations: Record<string, string> = {
  "Halaman ini belum tersedia": "This page is not available yet",
  "Periksa alamatnya, atau kembali ke minggu Anda.": "Check the address or return to your week.",
  "Kembali": "Go back", "Navigasi utama": "Main navigation", "Masuk": "Sign in",
  "Mulai gratis": "Get started for free", "Buka planner": "Open planner",
  "RAPIKAN MINGGU, SATU HAL SEKALI": "MAKE SPACE FOR ONE THING AT A TIME",
  "Lebih banyak ruang untuk": "More room for", "yang penting.": "what matters.",
  "Taruh tugas pada harinya, simpan yang belum pasti, lalu jalani minggu dengan kepala lebih ringan.": "Place tasks on the right day, save the uncertain ones for later, and move through your week with a clearer mind.",
  "Susun minggu saya": "Plan my week", "Gratis digunakan · Dirancang untuk penggunaan personal": "Free to use · Made for personal planning",
  "Satu minggu, satu langkah yang terasa mungkin.": "One week, one step at a time.", "Ilustrasi planner mingguan": "Weekly planner illustration",
  "Rencana yang cukup": "A plan that feels right", "Waktu untuk jeda": "Time to pause", "MINGGU INI": "THIS WEEK",
  "Pelan-pelan, tetap bergerak": "Take it slow, keep moving", "SENIN SAMPAI MINGGU": "MONDAY THROUGH SUNDAY",
  "Semua hari punya tempatnya.": "Every day has its place.", "TANPA TANGGAL": "UNSCHEDULED",
  "Simpan ide untuk nanti.": "Save ideas for later.", "BUAT JALANMU SENDIRI": "MAKE YOUR OWN WAY",
  "Rencana boleh berubah.": "Plans can change.", "MULAI DARI YANG TERDEKAT": "START WITH WHAT'S CLOSE",
  "terasa milikmu.": "feel like yours.", "Temukan ritmemu sendiri": "Find your own rhythm",
  "Kembali ke beranda": "Back to home", "Alamat email": "Email address", "Kata sandi": "Password",
  "Minimal 8 karakter": "At least 8 characters", "Weekflow · Planner yang memberi ruang": "Weekflow · A planner with room to breathe",
  "Preferensi": "Settings", "Keluar": "Sign out", "Rencanakan dengan": "Plan with", "tenang.": "ease.",
  "Tambah tugas": "Add a task", "MINGGU TERPILIH": "SELECTED WEEK", "Minggu sebelumnya": "Previous week",
  "Minggu berikutnya": "Next week", "Pilih hari": "Choose a day", "Hari ini": "Today",
  "Planner belum bisa dimuat.": "The planner could not load.", "Periksa lagi sebentar lagi. Data lokalmu tetap ada.": "Please try again shortly. Your local data is still here.",
  "Memuat planner": "Loading planner", "Ruang untuk hal baru.": "Room for something new.", "Tambah hal": "Add an item",
  "Belum dijadwalkan": "Unscheduled", "Catat dulu. Cari harinya nanti.": "Write it down now. Find a day for it later.",
  "Hal yang belum punya hari juga tetap punya tempat.": "Things without a day still have a place.", "Tulis satu hal": "Add an item",
  "Rencana yang baik memberi ruang untuk berubah.": "A good plan leaves room to change.", "Tutup pemberitahuan": "Close notice",
  "Aksi untuk": "Actions for", "Pindahkan": "Move", "ke tanggal": "to date", "Judul tugas": "Task title",
  "Misalnya: kirim draf ke tim": "For example: send the team a draft", "Tanggal (opsional)": "Date (optional)",
  "Tutup": "Close", "Kembali ke planner": "Back to planner", "ritme milikmu.": "your rhythm.",
  "Pilih cara Weekflow menemani harimu.": "Choose how Weekflow fits into your day.", "Tampilan": "Appearance",
  "Pilih suasana layar yang terasa nyaman.": "Choose a screen style that feels comfortable.", "Terang": "Light", "Gelap": "Dark",
  "Ikuti perangkat": "Use device setting", "Awal minggu": "Week starts on", "Tentukan hari pertama dalam planner.": "Choose the first day of your planner week.",
  "Senin": "Monday", "Minggu": "Sunday", "Akun saat ini": "Current account", "Browser ini": "This browser",
  "Rencanakan dengan tenang.": "Plan with ease.", "nanti": "later",
  "Ruang sederhana untuk mengumpulkan hal-hal yang ingin kamu selesaikan, tanpa harus mengerjakan semuanya sekaligus.": "A simple space to gather what you want to get done, without needing to do it all at once.",
  "AWAL YANG BAIK": "A GOOD BEGINNING", "SENANG MELIHATMU LAGI": "WELCOME BACK",
  "Buat ruang untuk rencanamu.": "Make room for your plans.", "Lanjutkan dari tempatmu.": "Pick up where you left off.",
  "Masukkan email dan kata sandi untuk membuat akun.": "Enter your email and password to create an account.",
  "Masuk untuk melanjutkan rencanamu.": "Sign in to continue planning.", "Buat akun": "Create account", "Masuk ke akun": "Sign in",
  "Sudah punya akun?": "Already have an account?", "Belum punya akun?": "New to Weekflow?", "Daftar": "Sign up",
  "Masuk sebagai": "Signed in as", "WAKTUNYA MENYUSUN ULANG": "TIME TO RESET",
  "Minggu ini": "This week", "Tugas": "Tasks", "Perubahan belum tersimpan. Coba lagi.": "Changes were not saved. Please try again.",
  "Tugas dipindahkan.": "Task moved.", "Tugas disimpan tanpa tanggal.": "Task saved without a date.", "Urutan tugas diperbarui.": "Task order updated.",
  "Coba lagi": "Try again", "Satu hal selesai. Bagus.": "One thing done. Nice work.", "Tugas dibuka kembali.": "Task reopened.",
  "Tugas dihapus.": "Task deleted.", "tugas": "tasks", "Tambah": "Add", "Satu minggu pada satu waktu.": "One week at a time.",
  "Perubahan disimpan.": "Changes saved.", "Tugas ditambahkan.": "Task added.", "Buka kembali": "Reopen", "Tandai": "Mark",
  "selesai": "complete", "Edit": "Edit", "Hapus": "Delete", "Pindah": "Move", "Pindahkan ke hari lain": "Move to another day",
  "Naikkan urutan": "Move up", "Turunkan urutan": "Move down", "Batal": "Cancel", "Simpan perubahan": "Save changes",
  "Simpan tugas": "Save task", "Menyimpan…": "Saving…", "Tulis judul agar tugas bisa disimpan.": "Add a title to save this task.",
  "Judul maksimal 200 karakter.": "Titles can be up to 200 characters.", "Belum tersimpan. Draft tetap ada, silakan coba lagi.": "Not saved. Your draft is still here; please try again.",
  "Preferensi disimpan di browser ini.": "Settings saved in this browser.", "Pratinjau lokal · data tersimpan di browser ini": "Local preview · data is saved in this browser",
  "SEN": "MON", "SEL": "TUE", "RAB": "WED", "KAM": "THU", "JUM": "FRI", "SAB": "SAT", "MIN": "SUN",
  "Minggumu tidak harus sempurna. Cukup punya arah.": "Your week does not need to be perfect. It just needs a direction.",
  "Waktunya menyusun ulang": "Time to reset",
  "Kata sandi perlu berisi setidaknya 8 karakter.": "Password must contain at least 8 characters.",
  "Ada kendala. Coba lagi sebentar.": "Something went wrong. Please try again.",
  "Tugas harus berisi 1 sampai 200 karakter.": "Task titles must be 1 to 200 characters.",
  "Email atau kata sandi tidak sesuai.": "Email or password is incorrect.",
  "Akun dengan email ini sudah ada.": "An account with this email already exists.",
  "Tidak ada akun dengan email ini.": "No account exists with this email.",
  "Tema tampilan": "Appearance theme", "Hari pertama minggu": "First day of the week",
  "Buka planner mingguan": "Open weekly planner", "Menu akun": "Account menu",
  "Ubah bahasa": "Change language", "Inggris": "English", "Bahasa Indonesia": "Indonesian",
};

function LanguageControl() {
  useEffect(() => {
    const language = localStorage.getItem("weekflow-language") || "id";
    const apply = () => {
      const english = localStorage.getItem("weekflow-language") === "en";
      document.documentElement.lang = english ? "en" : "id";
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      let node: Node | null;
      while ((node = walker.nextNode())) {
        const value = node.textContent?.trim();
        if (!value) continue;
        if (english && translations[value]) node.textContent = node.textContent?.replace(value, translations[value]) ?? "";
        else if (!english) {
          const original = Object.keys(translations).find((key) => translations[key] === value);
          if (original) node.textContent = node.textContent?.replace(value, original) ?? "";
        }
      }
      document.querySelectorAll<HTMLElement>("[placeholder], [aria-label]").forEach((element) => {
        for (const attr of ["placeholder", "aria-label"]) {
          const value = element.getAttribute(attr);
          if (!value) continue;
          if (english && translations[value]) element.setAttribute(attr, translations[value]);
          else if (!english) {
            const original = Object.keys(translations).find((key) => translations[key] === value);
            if (original) element.setAttribute(attr, original);
          }
        }
      });
      const toggle = document.querySelector<HTMLButtonElement>(".language-toggle");
      const toggleText = english ? "EN" : "ID";
      if (toggle && toggle.textContent !== toggleText) toggle.textContent = toggleText;
      toggle?.setAttribute("aria-label", english ? "Change language to Indonesian" : "Change language to English");
    };
    const observer = new MutationObserver(apply);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    apply();
    void language;
    return () => observer.disconnect();
  }, []);

  return <button className="language-toggle" type="button" onClick={() => {
    const next = localStorage.getItem("weekflow-language") === "en" ? "id" : "en";
    localStorage.setItem("weekflow-language", next);
    document.documentElement.lang = next;
    window.location.reload();
  }} aria-label="Change language to English">ID</button>;
}

function Brand({ inverse = false }: { inverse?: boolean }) {
  return (
    <Link
      className={`brand${inverse ? " brand-inverse" : ""}`}
      href="/"
      aria-label="Weekflow, beranda"
    >
      <span className="brand-mark" aria-hidden="true">
        <i />
        <i />
        <i />
        <i />
      </span>
      <span>weekflow</span>
    </Link>
  );
}

function PreviewNotice() {
  return (
    <div className="preview-notice" role="note">
      <span className="notice-dot" />
      Pratinjau lokal · data tersimpan di browser ini
    </div>
  );
}

export default function AppRouter() {
  return <AppRouterContent />;
}

function AppRouterContent() {
  const path = usePathname() || "/";
  const router = useRouter();
  const [session, setSession] = useState<LocalSession | null>(null);
  const [sessionReady, setSessionReady] = useState(false);

  useEffect(() => {
    setSession(getSession());
    setSessionReady(true);
  }, []);

  if (path === "/" || path === "/index") return <Landing session={session} />;
  if (path === "/register" || path === "/login")
    return (
      <AuthScreen
        mode={path === "/register" ? "register" : "login"}
        onSuccess={(next) => {
          setSession(next);
          router.push("/planner");
        }}
      />
    );
  if (path === "/planner")
    return (
      <Planner
        session={session}
        sessionReady={sessionReady}
        onSignOut={() => {
          signOut();
          setSession(null);
          router.push("/login");
        }}
      />
    );
  if (path === "/settings")
    return (
      <Settings
        session={session}
        sessionReady={sessionReady}
        onSignOut={() => {
          signOut();
          setSession(null);
          router.push("/login");
        }}
      />
    );
  return (
    <main className="not-found">
      <Brand />
      <h1>Halaman ini belum tersedia</h1>
      <p>Periksa alamatnya, atau kembali ke minggu Anda.</p>
      <Link className="button button-primary" href={session ? "/planner" : "/"}>
        Kembali
      </Link>
    </main>
  );
}

function Landing({ session }: { session: LocalSession | null }) {
  return (
    <main className="landing-shell">
      <header className="landing-header">
        <Brand />
        <nav aria-label="Navigasi utama">
          <Link href={session ? "/planner" : "/login"}>Masuk</Link>
          <Link
            className="button button-primary button-small"
            href={session ? "/planner" : "/register"}
          >
            {session ? "Buka planner" : "Mulai gratis"}
            <FaExternalLinkAlt aria-hidden="true" />
          </Link>
          <LanguageControl />
        </nav>
      </header>
      <section className="hero">
        <div className="hero-copy">
          <div className="eyebrow">
            <span className="eyebrow-line" />
            RAPIKAN MINGGU, SATU HAL SEKALI
          </div>
          <h1>
            Lebih banyak ruang untuk <em>yang penting.</em>
          </h1>
          <p>
            Taruh tugas pada harinya, simpan yang belum pasti, lalu jalani
            minggu dengan kepala lebih ringan.
          </p>
          <div className="hero-actions">
            <Link
              className="button button-primary button-large"
              href={session ? "/planner" : "/register"}
            >
              Susun minggu saya <FaArrowRight aria-hidden="true" />
            </Link>
            <span className="hero-caption">
              Gratis digunakan · Dirancang untuk penggunaan personal
            </span>
          </div>
          <div className="hero-proof">
            <span className="proof-mark" aria-hidden="true">
              <FaSun />
            </span>
            <span>Satu minggu, satu langkah yang terasa mungkin.</span>
          </div>
        </div>
        <div
          className="hero-art"
          role="img"
          aria-label="Ilustrasi planner mingguan"
        >
          <div className="art-orbit orbit-one" />
          <div className="art-orbit orbit-two" />
          <div className="art-sun" />
          <div className="art-note note-one">
            <span className="note-check"><FaCheck /></span>
            <span>Rencana yang cukup</span>
            <i>9:30</i>
          </div>
          <div className="art-note note-two">
            <span className="note-dot dot-terracotta" />
            <span>Waktu untuk jeda</span>
            <i>14:00</i>
          </div>
          <div className="art-card">
            <div className="art-card-top">
              <span>MINGGU INI</span>
              <span className="art-menu"><FaEllipsisH aria-hidden="true" /></span>
            </div>
            <div className="art-days">
              <span>SEN</span>
              <span>SEL</span>
              <span>RAB</span>
              <span>KAM</span>
              <span>JUM</span>
              <span>SAB</span>
              <span>MIN</span>
            </div>
            <div className="art-bars">
              <i />
              <i />
              <i />
              <i />
              <i />
              <i />
              <i />
            </div>
            <div className="art-card-bottom">
              <span className="art-avatar">W</span>
              <span>Pelan-pelan, tetap bergerak</span>
              <FaArrowRight aria-hidden="true" />
            </div>
          </div>
          <div className="art-stamp">
            SATU MINGGU
            <br />
            PADA SATU WAKTU
          </div>
        </div>
      </section>
      <section className="landing-footer">
        <div>
          <span className="footer-kicker">SENIN SAMPAI MINGGU</span>
          <span>Semua hari punya tempatnya.</span>
        </div>
        <div>
          <span className="footer-kicker">TANPA TANGGAL</span>
          <span>Simpan ide untuk nanti.</span>
        </div>
        <div>
          <span className="footer-kicker">BUAT JALANMU SENDIRI</span>
          <span>Rencana boleh berubah.</span>
        </div>
        <span className="footer-sprig" aria-hidden="true">
          <FaSun />
        </span>
      </section>
    </main>
  );
}

function AuthScreen({
  mode,
  onSuccess,
}: {
  mode: "register" | "login";
  onSuccess: (session: LocalSession) => void;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const isRegister = mode === "register";
  const submit = (event: FormEvent) => {
    event.preventDefault();
    setError("");
    if (password.length < 8) {
      setError("Kata sandi perlu berisi setidaknya 8 karakter.");
      return;
    }
    setBusy(true);
    try {
      onSuccess(isRegister ? signUp(email, password) : signIn(email, password));
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Ada kendala. Coba lagi sebentar.",
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <main className="auth-shell">
      <section className="auth-visual">
        <Brand inverse />
        <LanguageControl />
        <div className="auth-visual-copy">
          <span className="eyebrow eyebrow-light">
            <span className="eyebrow-line" />
            MULAI DARI YANG TERDEKAT
          </span>
          <h1>
            Rencana yang
            <br />
            <em>terasa milikmu.</em>
          </h1>
          <p>
            Ruang sederhana untuk mengumpulkan hal-hal yang ingin kamu
            selesaikan, tanpa harus mengerjakan semuanya sekaligus.
          </p>
        </div>
        <div className="auth-visual-foot">
          <span>01 / 07</span>
          <span className="visual-rule" />
          <span>Temukan ritmemu sendiri</span>
        </div>
        <div className="visual-scribble" aria-hidden="true">
          <FaSun />
        </div>
      </section>
      <section className="auth-panel">
        <div className="auth-panel-inner">
          <Link className="back-link" href="/">
            <FaArrowLeft aria-hidden="true" /> <span>Kembali ke beranda</span>
          </Link>
          <div className="auth-heading">
            <span className="auth-kicker">
              {isRegister ? "AWAL YANG BAIK" : "SENANG MELIHATMU LAGI"}
            </span>
            <h2>
              {isRegister
                ? "Buat ruang untuk rencanamu."
                : "Lanjutkan dari tempatmu."}
            </h2>
            <p>
              {isRegister
                ? "Satu akun, satu minggu yang lebih tertata."
                : "Masuk untuk membuka planner mingguanmu."}
            </p>
          </div>
          <form className="auth-form" onSubmit={submit} noValidate>
            <label htmlFor="email">Alamat email</label>
            <input
              autoComplete="email"
              id="email"
              name="email"
              type="email"
              placeholder="nama@email.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
            <label htmlFor="password">Kata sandi</label>
            <input
              autoComplete={isRegister ? "new-password" : "current-password"}
              id="password"
              name="password"
              type="password"
              placeholder="Minimal 8 karakter"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              minLength={8}
            />
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <button
              className="button button-primary button-submit"
              type="submit"
              disabled={busy}
            >
              {busy
                ? "Sebentar…"
                : isRegister
                  ? "Buat akun"
                  : "Masuk ke Weekflow"}
              <FaArrowRight aria-hidden="true" />
            </button>
            <p className="auth-switch">
              {isRegister ? "Sudah punya akun?" : "Belum punya akun?"}{" "}
              <Link href={isRegister ? "/login" : "/register"}>
                {isRegister ? "Masuk" : "Daftar"}
              </Link>
            </p>
          </form>
          <div className="auth-divider">
            <span />
            UNTUK SEKARANG
            <span />
          </div>
          <div className="auth-local-note">
            <span className="local-icon" aria-hidden="true">
              <FaRegCircle />
            </span>
            <p>
              Mode pratinjau menyimpan sesi dan tugas di browser ini. Hubungkan
              backend untuk akun dan sinkronisasi sungguhan.
            </p>
          </div>
          <div className="auth-bottom">
            <span>Weekflow · Planner yang memberi ruang</span>
          </div>
        </div>
      </section>
    </main>
  );
}

function Planner({
  session,
  sessionReady,
  onSignOut,
}: {
  session: LocalSession | null;
  sessionReady: boolean;
  onSignOut: () => void;
}) {
  const router = useRouter();
  const [anchor, setAnchor] = useState(() => mondayOf(new Date()));
  const [weekStarts, setWeekStarts] = useState(1);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [activeDay, setActiveDay] = useState(todayKey);
  const [showUnscheduled, setShowUnscheduled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [editor, setEditor] = useState<{
    task?: Task;
    date: string | null;
  } | null>(null);
  const [status, setStatus] = useState("");
  const [failure, setFailure] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (sessionReady && !session) router.replace("/login");
  }, [session, sessionReady, router]);
  useEffect(() => {
    const saved = localStorage.getItem(
      `weekflow-preferences:${session?.email}`,
    );
    if (saved) {
      try {
        setWeekStarts(JSON.parse(saved).weekStarts ?? 1);
      } catch {}
    }
  }, [session]);
  useEffect(() => {
    if (!session) return;
    let canceled = false;
    setLoaded(false);
    setFailure(false);
    const start = mondayOf(anchor, weekStarts);
    const end = shift(start, 6);
    window.setTimeout(() => {
      if (canceled) return;
      try {
        setTasks(listTasks(session.email, dayKey(start), dayKey(end)));
        setLoaded(true);
      } catch {
        setFailure(true);
        setLoaded(true);
      }
    }, 180);
    return () => {
      canceled = true;
    };
  }, [anchor, session, weekStarts]);

  const weekStart = useMemo(
    () => mondayOf(anchor, weekStarts),
    [anchor, weekStarts],
  );
  const dates = useMemo(
    () => Array.from({ length: 7 }, (_, index) => shift(weekStart, index)),
    [weekStart],
  );
  const allTasks = useMemo(
    () => (session ? listTasks(session.email) : []),
    [session, tasks],
  );
  const unscheduled = allTasks
    .filter((task) => !task.scheduledDate)
    .sort((a, b) => a.position - b.position);
  const orderedFor = (date: string) =>
    tasks
      .filter((task) => task.scheduledDate === date)
      .sort((a, b) => a.position - b.position);
  const weekLabel = `${dateLabel(dates[0], { day: "numeric", month: "long" })} sampai ${dateLabel(dates[6], { day: "numeric", month: "long", year: "numeric" })}`;
  const saved = (message: string) => {
    setStatus(message);
    window.setTimeout(() => setStatus(""), 2600);
  };
  const refresh = () => {
    if (session) {
      const start = mondayOf(anchor, weekStarts);
      setTasks(
        listTasks(session.email, dayKey(start), dayKey(shift(start, 6))),
      );
    }
  };
  const runMutation = (work: () => void, message: string) => {
    if (!session) return false;
    try {
      work();
      refresh();
      saved(message);
      return true;
    } catch {
      setNotice("Perubahan belum tersimpan. Coba lagi.");
      return false;
    }
  };
  const openCreate = (date: string | null) => {
    if (!date) setShowUnscheduled(true);
    setEditor({ date });
  };
  const move = (task: Task, date: string | null) => {
    if (!date) setShowUnscheduled(true);
    return runMutation(
      () => moveTask(session!.email, task.id, date),
      date ? "Tugas dipindahkan." : "Tugas disimpan tanpa tanggal.",
    );
  };
  const shiftTask = (task: Task, direction: -1 | 1) =>
    runMutation(
      () => reorderTask(session!.email, task.id, direction),
      "Urutan tugas diperbarui.",
    );
  if (!sessionReady || !session)
    return (
      <div className="loading-page">
        <div className="skeleton skeleton-header" />
        <div className="skeleton skeleton-title" />
        <div className="skeleton skeleton-grid" />
      </div>
    );
  return (
    <div className="app-shell">
      <header className="app-header">
        <Brand />
        <div className="header-right">
          <LanguageControl />
          <PreviewNotice />
          <div className="account-wrap">
            <button
              className="account-button"
              type="button"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen(!menuOpen)}
            >
              <span className="account-avatar">
                {session.email.slice(0, 1).toUpperCase()}
              </span>
              <span className="account-email">{session.email}</span>
              <FaChevronDown aria-hidden="true" />
            </button>
            {menuOpen && (
              <div className="account-menu">
                <div className="menu-email">
                  Masuk sebagai
                  <br />
                  <strong>{session.email}</strong>
                </div>
                <Link href="/settings" onClick={() => setMenuOpen(false)}>
                  Preferensi <FaExternalLinkAlt aria-hidden="true" />
                </Link>
                <button type="button" onClick={onSignOut}>
                  Keluar <FaExternalLinkAlt aria-hidden="true" />
                </button>
              </div>
            )}
          </div>
        </div>
      </header>
      <main className="planner-main">
        <div className="planner-topline">
          <div>
            <div className="eyebrow planner-eyebrow">
              <span className="eyebrow-line" />
              WAKTUNYA MENYUSUN ULANG
            </div>
            <h1>
              Rencanakan dengan <em>tenang.</em>
            </h1>
            <p className="planner-intro">
              Minggumu tidak harus sempurna. Cukup punya arah.
            </p>
          </div>
          <button
            className="button button-primary add-main"
            onClick={() => openCreate(null)}
          >
            <FaPlus aria-hidden="true" /> Tambah tugas
          </button>
        </div>
        <section className="week-panel" aria-label="Planner mingguan">
          <div className="week-toolbar">
            <div className="week-caption">
              <span className="week-overline">MINGGU TERPILIH</span>
              <h2 aria-live="polite">{weekLabel}</h2>
            </div>
            <div className="week-controls">
              <button
                className="icon-button"
                aria-label="Minggu sebelumnya"
                onClick={() => {
                  const next = shift(anchor, -7);
                  setAnchor(next);
                  setActiveDay(dayKey(next));
                }}
              >
                <FaArrowLeft aria-hidden="true" />
              </button>
              <button
                className="button button-soft"
                onClick={() => {
                  const now = new Date();
                  setAnchor(now);
                  setActiveDay(todayKey);
                }}
              >
                Minggu ini
              </button>
              <button
                className="icon-button"
                aria-label="Minggu berikutnya"
                onClick={() => {
                  const next = shift(anchor, 7);
                  setAnchor(next);
                  setActiveDay(dayKey(next));
                }}
              >
                <FaArrowRight aria-hidden="true" />
              </button>
            </div>
          </div>
          <div className="mobile-day-nav" aria-label="Pilih hari">
            {dates.map((date) => {
              const key = dayKey(date);
              return (
                <button
                  key={key}
                  className={
                    activeDay === key ? "mobile-day active" : "mobile-day"
                  }
                  onClick={() => {
                    setActiveDay(key);
                    setShowUnscheduled(false);
                  }}
                >
                  <span>{dateLabel(date, { weekday: "short" })}</span>
                  <strong>{date.getDate()}</strong>
                  {key === todayKey && <i aria-label="Hari ini" />}
                </button>
              );
            })}
            <button
              className={
                showUnscheduled
                  ? "mobile-day someday-day active"
                  : "mobile-day someday-day"
              }
              onClick={() => setShowUnscheduled(true)}
            >
              <span>nanti</span>
              <strong><FaPlus aria-hidden="true" /></strong>
            </button>
          </div>
          {failure ? (
            <div className="state-card state-error" role="alert">
              <span className="state-symbol"><FaExclamationCircle /></span>
              <div>
                <strong>Planner belum bisa dimuat.</strong>
                <p>Periksa lagi sebentar lagi. Data lokalmu tetap ada.</p>
              </div>
              <button
                className="button button-soft"
                onClick={() => {
                  setFailure(false);
                  refresh();
                }}
              >
                Coba lagi
              </button>
            </div>
          ) : !loaded ? (
            <div className="loading-grid" aria-label="Memuat planner">
              <div className="skeleton skeleton-day" />
              <div className="skeleton skeleton-day" />
              <div className="skeleton skeleton-day" />
              <div className="skeleton skeleton-day" />
              <div className="skeleton skeleton-day" />
              <div className="skeleton skeleton-day" />
              <div className="skeleton skeleton-day" />
            </div>
          ) : (
            <div className="week-grid">
              {dates.map((date) => {
                const key = dayKey(date);
                const dayTasks = orderedFor(key);
                return (
                  <section
                    className={`day-column${key === todayKey ? " is-today" : ""}${key === activeDay ? " is-active" : ""}`}
                    key={key}
                    aria-labelledby={`day-${key}`}
                  >
                    <header className="day-heading">
                      <div>
                        <h3 id={`day-${key}`}>
                          {dateLabel(date, { weekday: "long" })}
                        </h3>
                        <span className="day-date">
                          {dateLabel(date, { day: "numeric", month: "short" })}
                        </span>
                      </div>
                      {key === todayKey && (
                        <span className="today-tag">Hari ini</span>
                      )}
                    </header>
                    <div className="task-list">
                      {dayTasks.length ? (
                        dayTasks.map((task, index) => (
                          <TaskCard
                            key={task.id}
                            task={task}
                            onToggle={() =>
                              runMutation(
                                () =>
                                  setTaskCompletion(
                                    session.email,
                                    task.id,
                                    !task.completed,
                                  ),
                                task.completed
                                  ? "Tugas dibuka kembali."
                                  : "Satu hal selesai. Bagus.",
                              )
                            }
                            onEdit={() => setEditor({ task, date: key })}
                            onDelete={() => {
                              if (window.confirm(`Hapus “${task.title}”?`))
                                runMutation(
                                  () => deleteTask(session.email, task.id),
                                  "Tugas dihapus.",
                                );
                            }}
                            onMove={move}
                            onShift={(direction) => shiftTask(task, direction)}
                            canUp={index > 0}
                            canDown={index < dayTasks.length - 1}
                          />
                        ))
                      ) : (
                        <div className="day-empty">
                          <span aria-hidden="true"><FaSun /></span>
                          <p>Ruang untuk hal baru.</p>
                        </div>
                      )}
                    </div>
                    <button
                      className="add-day"
                      type="button"
                      onClick={() => openCreate(key)}
                    >
                      <FaPlus aria-hidden="true" /> Tambah hal
                    </button>
                  </section>
                );
              })}
            </div>
          )}
        </section>
        <section
          className={`unscheduled-panel${showUnscheduled ? " mobile-show" : ""}`}
        >
          <div className="unscheduled-heading">
            <div className="unscheduled-icon" aria-hidden="true">
              <FaExternalLinkAlt />
            </div>
            <div>
              <h2>Belum dijadwalkan</h2>
              <p>Catat dulu. Cari harinya nanti.</p>
            </div>
            <span className="task-count">
              {unscheduled.length}{" "}
              {unscheduled.length === 1 ? "tugas" : "tugas"}
            </span>
            <button
              className="button button-soft unscheduled-add"
              onClick={() => openCreate(null)}
            >
              <><FaPlus aria-hidden="true" /> Tambah</>
            </button>
          </div>
          {unscheduled.length ? (
            <div className="unscheduled-list">
              {unscheduled.map((task, index) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onToggle={() =>
                    runMutation(
                      () =>
                        setTaskCompletion(
                          session.email,
                          task.id,
                          !task.completed,
                        ),
                      task.completed
                        ? "Tugas dibuka kembali."
                        : "Satu hal selesai. Bagus.",
                    )
                  }
                  onEdit={() => setEditor({ task, date: null })}
                  onDelete={() => {
                    if (window.confirm(`Hapus “${task.title}”?`))
                      runMutation(
                        () => deleteTask(session.email, task.id),
                        "Tugas dihapus.",
                      );
                  }}
                  onMove={move}
                  onShift={(direction) => shiftTask(task, direction)}
                  canUp={index > 0}
                  canDown={index < unscheduled.length - 1}
                />
              ))}
            </div>
          ) : (
            <div className="unscheduled-empty">
              <span className="empty-sun" aria-hidden="true">
                <FaSun />
              </span>
              <div>
                <strong>
                  {allTasks.length
                    ? "Tidak ada yang tertinggal tanpa rencana."
                    : "Pikiranmu boleh mendarat di sini."}
                </strong>
                <p>Hal yang belum punya hari juga tetap punya tempat.</p>
              </div>
              <button className="text-button" onClick={() => openCreate(null)}>
                Tulis satu hal <FaArrowRight aria-hidden="true" />
              </button>
            </div>
          )}
        </section>
        <footer className="planner-footer">
          <span>
            <span className="footer-flower" aria-hidden="true">
              <FaSun />
            </span>{" "}
            Satu minggu pada satu waktu.
          </span>
          <span>Rencana yang baik memberi ruang untuk berubah.</span>
        </footer>
      </main>
      {status && (
        <div className="toast" role="status">
          <FaCheck aria-hidden="true" /> <span>{status}</span>
        </div>
      )}
      {notice && (
        <div className="toast toast-error" role="alert">
          <FaExclamationCircle aria-hidden="true" /> <span>{notice}</span>
          <button
            onClick={() => setNotice("")}
            aria-label="Tutup pemberitahuan"
          >
            <FaTimes aria-hidden="true" />
          </button>
        </div>
      )}
      {editor && (
        <TaskEditor
          task={editor.task}
          initialDate={editor.date}
          onClose={() => setEditor(null)}
          onSave={(title, date) => {
            if (!session) return false;
            const ok = runMutation(
              () =>
                editor.task
                  ? updateTask(session.email, editor.task.id, title, date)
                  : createTask(session.email, title, date),
              editor.task ? "Perubahan disimpan." : "Tugas ditambahkan.",
            );
            if (ok) setEditor(null);
            return ok;
          }}
        />
      )}
    </div>
  );
}

function TaskCard({
  task,
  onToggle,
  onEdit,
  onDelete,
  onMove,
  onShift,
  canUp,
  canDown,
}: {
  task: Task;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onMove: (task: Task, date: string | null) => void;
  onShift: (direction: -1 | 1) => void;
  canUp: boolean;
  canDown: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (!open) return;
    const trigger = triggerRef.current;
    const menu = menuRef.current;
    if (!trigger || !menu) return;
    const rect = trigger.getBoundingClientRect();
    const bounds = menu.getBoundingClientRect();
    const gap = 8;
    const top = rect.bottom + bounds.height + gap <= window.innerHeight
      ? rect.bottom + 4
      : Math.max(gap, rect.top - bounds.height - 4);
    const left = Math.max(gap, Math.min(rect.right - bounds.width, window.innerWidth - bounds.width - gap));
    setMenuPosition({ top, left });
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const closeOnViewportChange = () => setOpen(false);
    window.addEventListener("scroll", closeOnViewportChange, true);
    window.addEventListener("resize", closeOnViewportChange);
    return () => {
      window.removeEventListener("scroll", closeOnViewportChange, true);
      window.removeEventListener("resize", closeOnViewportChange);
    };
  }, [open]);
  return (
    <article className={`task-card${task.completed ? " task-completed" : ""}`}>
      <button
        className="task-check"
        type="button"
        aria-label={
          task.completed
            ? `Buka kembali ${task.title}`
            : `Tandai ${task.title} selesai`
        }
        aria-pressed={task.completed}
        onClick={onToggle}
      >
        {task.completed ? <FaCheck aria-hidden="true" /> : null}
      </button>
      <button className="task-title" type="button" onClick={onEdit}>
        {task.title}
      </button>
      <div className="task-menu-wrap">
        <button
          ref={triggerRef}
          className="task-menu-trigger"
          aria-label={`Aksi untuk ${task.title}`}
          aria-expanded={open}
          onClick={(event) => {
            if (!open) {
              const rect = event.currentTarget.getBoundingClientRect();
              setMenuPosition({
                top: Math.max(8, Math.min(rect.bottom + 4, window.innerHeight - 340)),
                left: Math.max(8, Math.min(rect.right - 224, window.innerWidth - 232)),
              });
            }
            setOpen(!open);
          }}
        >
          <FaEllipsisH aria-hidden="true" />
        </button>
        {open && typeof document !== "undefined" && createPortal(
          <div ref={menuRef} className="task-menu" style={menuPosition}>
            <button
              onClick={() => {
                onEdit();
                setOpen(false);
              }}
            >
              Ubah tugas
            </button>
            <label htmlFor={`move-date-${task.id}`}>
              Tanggal baru
              <input
                id={`move-date-${task.id}`}
                aria-label={`Pindahkan ${task.title} ke tanggal`}
                type="date"
                value={task.scheduledDate ?? ""}
                onChange={(event) => {
                  onMove(task, event.target.value || null);
                  setOpen(false);
                }}
              />
            </label>
            <button
              onClick={() => {
                onMove(task, null);
                setOpen(false);
              }}
            >
              Simpan tanpa tanggal
            </button>
            <div className="reorder-actions">
              <button
                disabled={!canUp}
                onClick={() => {
                  onShift(-1);
                  setOpen(false);
                }}
              >
                <FaArrowUp aria-hidden="true" />{" "}
                Pindah ke atas
              </button>
              <button
                disabled={!canDown}
                onClick={() => {
                  onShift(1);
                  setOpen(false);
                }}
              >
                <FaArrowDown aria-hidden="true" />{" "}
                Pindah ke bawah
              </button>
            </div>
            <button
              className="menu-danger"
              onClick={() => {
                onDelete();
                setOpen(false);
              }}
            >
              Hapus tugas
            </button>
          </div>,
          document.body,
        )}
      </div>
    </article>
  );
}

function TaskEditor({
  task,
  initialDate,
  onClose,
  onSave,
}: {
  task?: Task;
  initialDate: string | null;
  onClose: () => void;
  onSave: (title: string, date: string | null) => boolean;
}) {
  const [title, setTitle] = useState(task?.title ?? "");
  const [date, setDate] = useState(task?.scheduledDate ?? initialDate ?? "");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const dialogRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const trigger = document.activeElement as HTMLElement | null;
    const dialog = dialogRef.current;
    dialog?.querySelector<HTMLElement>("input,button,select")?.focus();
    return () => trigger?.focus();
  }, []);
  useEffect(() => {
    const dialog = dialogRef.current;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab" || !dialog) return;
      const items = [
        ...dialog.querySelectorAll<HTMLElement>(
          "button:not([disabled]),input:not([disabled]),select:not([disabled])",
        ),
      ];
      if (!items.length) return;
      const first = items[0],
        last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const clean = title.trim();
    if (!clean) {
      setError("Tulis judul agar tugas bisa disimpan.");
      return;
    }
    if (clean.length > 200) {
      setError("Judul maksimal 200 karakter.");
      return;
    }
    setError("");
    setBusy(true);
    if (!onSave(clean, date || null)) {
      setBusy(false);
      setError("Belum tersimpan. Draft tetap ada, silakan coba lagi.");
    }
  };
  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        ref={dialogRef}
        className="task-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="editor-title"
      >
        <button
          className="dialog-close"
          type="button"
          onClick={onClose}
          aria-label="Tutup"
        >
            <FaTimes aria-hidden="true" />
        </button>
        <div className="dialog-kicker">
          {task ? "RAPIKAN RENCANA" : "TANGKAP DULU"}
        </div>
        <h2 id="editor-title">{task ? "Ubah tugas" : "Tambahkan satu hal."}</h2>
        <p>
          {task
            ? "Rencanamu boleh berubah bentuk."
            : "Tidak perlu tahu semuanya sekarang."}
        </p>
        <form onSubmit={submit}>
          <label htmlFor="task-title">Judul tugas</label>
          <input
            id="task-title"
            maxLength={200}
            placeholder="Misalnya: kirim draf ke tim"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            aria-describedby={error ? "task-title-error" : undefined}
          />
          <label htmlFor="task-date">Tanggal (opsional)</label>
          <input
            id="task-date"
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
          />
          <button
            className="text-button date-clear"
            type="button"
            onClick={() => setDate("")}
          >
            Simpan tanpa tanggal
          </button>
          {error && (
            <p id="task-title-error" className="form-error" role="alert">
              {error}
            </p>
          )}
          <div className="dialog-actions">
            <button
              className="button button-soft"
              type="button"
              onClick={onClose}
            >
              Batal
            </button>
            <button
              className="button button-primary"
              type="submit"
              disabled={busy}
              aria-busy={busy}
            >
              {busy ? "Menyimpan…" : task ? "Simpan perubahan" : "Simpan tugas"}
              <FaArrowRight aria-hidden="true" />
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function Settings({
  session,
  sessionReady,
  onSignOut,
}: {
  session: LocalSession | null;
  sessionReady: boolean;
  onSignOut: () => void;
}) {
  const router = useRouter();
  const [theme, setTheme] = useState("light");
  const [weekStarts, setWeekStarts] = useState(1);
  const [status, setStatus] = useState("");
  useEffect(() => {
    if (sessionReady && !session) router.replace("/login");
  }, [session, sessionReady, router]);
  useEffect(() => {
    if (!session) return;
    try {
      const saved = JSON.parse(
        localStorage.getItem(`weekflow-preferences:${session.email}`) || "{}",
      );
      setTheme(saved.theme || "light");
      setWeekStarts(saved.weekStarts ?? 1);
    } catch {}
  }, [session]);
  useEffect(() => {
    const root = document.documentElement;
    if (theme !== "system") {
      root.dataset.theme = theme;
      return;
    }
    const preference = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      root.dataset.theme = preference.matches ? "dark" : "light";
    };
    apply();
    preference.addEventListener("change", apply);
    return () => preference.removeEventListener("change", apply);
  }, [theme]);
  const persist = (nextTheme = theme, nextWeek = weekStarts) => {
    if (session)
      localStorage.setItem(
        `weekflow-preferences:${session.email}`,
        JSON.stringify({ theme: nextTheme, weekStarts: nextWeek }),
      );
    setStatus("Preferensi disimpan di browser ini.");
    window.setTimeout(() => setStatus(""), 2400);
  };
  if (!sessionReady || !session)
    return (
      <div className="loading-page">
        <div className="skeleton skeleton-header" />
        <div className="skeleton skeleton-grid" />
      </div>
    );
  return (
    <div className="app-shell">
      <header className="app-header">
        <Brand />
        <div className="header-right">
          <LanguageControl />
          <PreviewNotice />
          <button className="button button-soft" onClick={onSignOut}>
            Keluar
          </button>
        </div>
      </header>
      <main className="settings-main">
        <Link className="back-link" href="/planner">
          <FaArrowLeft aria-hidden="true" /> <span>Kembali ke planner</span>
        </Link>
        <div className="settings-title">
          <div className="eyebrow">
            <span className="eyebrow-line" />
            RUANG PRIBADIMU
          </div>
          <h1>
            Preferensi kecil,
            <br />
            <em>ritme milikmu.</em>
          </h1>
          <p>Pilih cara Weekflow menemani harimu.</p>
        </div>
        <section className="settings-card">
          <div className="settings-row">
            <div>
              <h2>Tampilan</h2>
              <p>Pilih suasana layar yang terasa nyaman.</p>
            </div>
            <select
              value={theme}
              onChange={(event) => {
                setTheme(event.target.value);
                persist(event.target.value, weekStarts);
              }}
              aria-label="Tema tampilan"
            >
              <option value="light">Terang</option>
              <option value="dark">Gelap</option>
              <option value="system">Ikuti perangkat</option>
            </select>
          </div>
          <div className="settings-row">
            <div>
              <h2>Awal minggu</h2>
              <p>Tentukan hari pertama dalam planner.</p>
            </div>
            <select
              value={weekStarts}
              onChange={(event) => {
                const value = Number(event.target.value);
                setWeekStarts(value);
                persist(theme, value);
              }}
              aria-label="Hari pertama minggu"
            >
              <option value={1}>Senin</option>
              <option value={0}>Minggu</option>
            </select>
          </div>
          <div className="settings-row account-setting">
            <div>
              <h2>Akun saat ini</h2>
              <p>{session.email}</p>
            </div>
            <span className="local-badge">Browser ini</span>
          </div>
        </section>
        <div className="settings-note">
          <FaRegCircle aria-hidden="true" />
          <p>
            Pengaturan tersimpan di perangkat ini. Sinkronisasi akun akan
            tersedia setelah backend Weekflow terhubung.
          </p>
        </div>
      </main>
      <footer className="planner-footer settings-footer">
        <span>
          <span className="footer-flower" aria-hidden="true">
            <FaSun />
          </span>{" "}
          Satu minggu pada satu waktu.
        </span>
      </footer>
      {status && (
        <div className="toast" role="status">
          <FaCheck aria-hidden="true" /> <span>{status}</span>
        </div>
      )}
    </div>
  );
}
