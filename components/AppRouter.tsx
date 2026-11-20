"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { OAuthProvider, useAuth } from "@appwrite.io/react";
import { createPortal, flushSync } from "react-dom";
import { ModalFrame, useModalClose } from "./Modal";
import { AnalyticsBoard, AnalyticsPeek } from "./Analytics";
import { Avatar, ProfileSection } from "./ProfileEditor";
import { IntegrationsDialog, IntegrationsRow } from "./Integrations";
import { createContext, useCallback, useContext, useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import {
  FaArrowDown,
  FaArrowLeft,
  FaArrowRight,
  FaArrowUp,
  FaCheck,
  FaChevronDown,
  FaChevronLeft,
  FaChevronRight,
  FaEllipsisH,
  FaEye,
  FaEyeSlash,
  FaColumns,
  FaListUl,
  FaExclamationCircle,
  FaExternalLinkAlt,
  FaGoogle,
  FaPlus,
  FaRegCalendarAlt,
  FaRegCircle,
  FaSun,
  FaTimes,
} from "react-icons/fa";
import {
  createTask,
  deleteTask,
  listTasks,
  listUnscheduledTasks,
  moveTask,
  reorderTask,
  setTaskCompletion,
  syncProfile,
  updateTask,
  setTaskPriority,
  type Priority,
  type TaskDetails,
  type Task,
} from "@/lib/data";
import {
  toLocalSession,
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
/** Week start (0 = Sunday, 1 = Monday) shared with every calendar popup. */
const WeekStartContext = createContext(1);
const isEnglish = () => {
  try {
    return (
      typeof window !== "undefined" &&
      window.localStorage.getItem("weekflow-language") === "en"
    );
  } catch {
    return false;
  }
};
const dateLabel = (date: Date, options: Intl.DateTimeFormatOptions) => {
  const locale = isEnglish() ? "en-US" : "id-ID";
  return new Intl.DateTimeFormat(locale, options).format(date);
};
const todayKey = dayKey(new Date());
const priorityLabel = (priority: Priority) =>
  isEnglish()
    ? { low: "Low", medium: "Medium", high: "High" }[priority]
    : { low: "Rendah", medium: "Sedang", high: "Tinggi" }[priority];

const translations: Record<string, string> = {
  "Integrasi": "Integrations",
  "Integrasikan": "Integrate",
  "INTEGRASI": "INTEGRATIONS",
  "Integrasi dan layanan": "Integrations and services",
  "Hubungkan Weekflow dengan aplikasi yang sudah kamu pakai setiap hari.": "Connect Weekflow with the apps you already use every day.",
  "Cari integrasi…": "Search integrations…",
  "Cari integrasi": "Search integrations",
  "Kategori integrasi": "Integration categories",
  "Semua": "All",
  "Kalender": "Calendar",
  "Komunikasi": "Communication",
  "Hubungkan": "Connect",
  "Putuskan": "Disconnect",
  "Google Calendar belum bisa diputuskan. Coba lagi.": "Could not disconnect Google Calendar. Try again.",
  "Terhubung": "Connected",
  "Terhubung ke Google": "Connected to Google",
  "Memeriksa…": "Checking…",
  "Google Calendar belum bisa dihubungkan. Coba lagi.": "Could not connect Google Calendar. Try again.",
  "Integrasi lainnya": "More integrations",
  "Aplikasi lain akan segera hadir.": "More apps are coming soon.",
  "Integrasi untuk kategori ini segera hadir.": "Integrations for this category are coming soon.",
  "Segera hadir": "Coming soon",
  "Tidak ada integrasi yang cocok.": "No matching integrations.",
  "Tugas yang punya tanggal otomatis muncul di Google Calendar sebagai acara sehari penuh.": "Tasks with a date automatically appear in Google Calendar as all-day events.",
  "Hubungkan akun Google": "Connect Google account",
  "Tarik daftar tugas dari database Notion ke minggumu.": "Pull tasks from a Notion database into your week.",
  "Hubungkan workspace": "Connect workspace",
  "Sinkronkan tugas Todoist agar satu daftar tetap rapi.": "Sync Todoist tasks to keep a single tidy list.",
  "Hubungkan Todoist": "Connect Todoist",
  "Ubah kartu Trello yang punya tenggat menjadi tugas harian.": "Turn Trello cards with due dates into daily tasks.",
  "Hubungkan papan": "Connect board",
  "Terima ringkasan harian dan pengingat tugas di channel pilihanmu.": "Get daily summaries and task reminders in the channel you choose.",
  "Atur pengingat": "Set up reminders",
  "Lampirkan tautan rapat Zoom pada tugas yang punya jadwal.": "Attach Zoom meeting links to scheduled tasks.",
  "Hubungkan Zoom": "Connect Zoom",
  "Analitik": "Analytics",
  "RINGKASAN MINGGUMU": "YOUR WEEK AT A GLANCE",
  "Lihat ritme": "See the rhythm of",
  "mingguanmu.": "your week.",
  "Pantau tugas yang selesai dan yang masih menunggu.": "Track what is done and what is still waiting.",
  "Halaman ini belum tersedia": "This page is not available yet",
  "Periksa alamatnya, atau kembali ke minggumu.": "Check the address or return to your week.",
  "Kembali": "Go back",
  "Navigasi utama": "Main navigation",
  "Masuk": "Sign in",
  "Mulai gratis": "Get started for free",
  "Buka planner": "Open planner",
  "RAPIKAN MINGGU, SATU HAL SEKALI": "MAKE SPACE FOR ONE THING AT A TIME",
  "Lebih banyak ruang untuk": "More room for",
  "yang penting.": "what matters.",
  "Taruh tugas pada harinya, simpan yang belum pasti, lalu jalani minggu dengan kepala lebih ringan.": "Place tasks on the right day, save the uncertain ones for later, and move through your week with a clearer mind.",
  "Susun minggu saya": "Plan my week",
  "Gratis dipakai · Dirancang untuk keperluan pribadi": "Free to use · Made for personal planning",
  "Satu minggu, satu langkah yang terasa mungkin.": "One week, one step at a time.",
  "Ilustrasi planner mingguan": "Weekly planner illustration",
  "Rencana yang cukup": "A plan that feels right",
  "Waktu untuk jeda": "Time to pause",
  "MINGGU INI": "THIS WEEK",
  "Pelan-pelan, tetap bergerak": "Take it slow, keep moving",
  "SENIN SAMPAI MINGGU": "MONDAY THROUGH SUNDAY",
  "Semua hari punya tempatnya.": "Every day has its place.",
  "TANPA TANGGAL": "UNSCHEDULED",
  "Simpan ide untuk nanti.": "Save ideas for later.",
  "BUAT JALANMU SENDIRI": "MAKE YOUR OWN WAY",
  "Rencana boleh berubah.": "Plans can change.",
  "MULAI DARI YANG TERDEKAT": "START WITH WHAT'S CLOSE",
  "terasa milikmu.": "feel like yours.",
  "Temukan ritmemu sendiri": "Find your own rhythm",
  "Kembali ke beranda": "Back to home",
  "Alamat email": "Email address",
  "Kata sandi": "Password",
  "Minimal 8 karakter": "At least 8 characters",
  "Weekflow · Planner yang memberi ruang": "Weekflow · A planner with room to breathe",
  "Pengaturan": "Settings",
  "Keluar": "Sign out",
  "Rencanakan dengan": "Plan with",
  "tenang.": "ease.",
  "Tambah tugas": "Add a task",
  "MINGGU TERPILIH": "SELECTED WEEK",
  "Minggu sebelumnya": "Previous week",
  "Minggu berikutnya": "Next week",
  "Pilih hari": "Choose a day",
  "Hari ini": "Today",
  "Planner belum bisa dimuat.": "The planner could not load.",
  "Coba lagi sebentar lagi. Tugasmu tetap aman.": "Please try again shortly. Your tasks are safe.",
  "Memuat planner": "Loading planner",
  "Ruang untuk hal baru.": "Room for something new.",
  "Belum dijadwalkan": "Unscheduled",
  "Catat dulu. Cari harinya nanti.": "Write it down now. Find a day for it later.",
  "Tugas yang belum punya hari tetap punya tempat.": "Tasks without a day still have a place.",
  "Tulis satu tugas": "Add a task",
  "Rencana yang baik memberi ruang untuk berubah.": "A good plan leaves room to change.",
  "Tutup pemberitahuan": "Close notice",
  "Opsi untuk": "Options for",
  "Pindahkan": "Move",
  "ke tanggal": "to date",
  "Judul tugas": "Task title",
  "Misalnya: kirim draf ke tim": "For example: send the team a draft",
  "Tanggal (opsional)": "Date (optional)",
  "Tutup": "Close",
  "Kembali ke planner": "Back to planner",
  "ritme milikmu.": "your rhythm.",
  "Pilih cara Weekflow menemani harimu.": "Choose how Weekflow fits into your day.",
  "Tampilan": "Appearance",
  "Pilih suasana layar yang terasa nyaman.": "Choose a screen style that feels comfortable.",
  "Terang": "Light",
  "Gelap": "Dark",
  "Ikuti perangkat": "Use device setting",
  "Awal minggu": "Week starts on",
  "Tentukan hari pertama dalam planner.": "Choose the first day of your planner week.",
  "Senin": "Monday",
  "Minggu": "Sunday",
  "Akun saat ini": "Current account",
  "Terverifikasi": "Verified",
  "Belum diverifikasi": "Not verified",
  "Rencanakan dengan tenang.": "Plan with ease.",
  "nanti": "later",
  "Ruang sederhana untuk mengumpulkan hal-hal yang ingin kamu selesaikan, tanpa harus mengerjakan semuanya sekaligus.": "A simple space to gather what you want to get done, without needing to do it all at once.",
  "AWAL YANG BAIK": "A GOOD BEGINNING",
  "SENANG MELIHATMU LAGI": "WELCOME BACK",
  "Buat ruang untuk rencanamu.": "Make room for your plans.",
  "Lanjutkan dari tempatmu.": "Pick up where you left off.",
  "Masukkan email dan kata sandi untuk membuat akun.": "Enter your email and password to create an account.",
  "Masuk untuk melanjutkan rencanamu.": "Sign in to continue planning.",
  "Buat akun": "Create account",
  "Masuk ke akun": "Sign in",
  "Sudah punya akun?": "Already have an account?",
  "Belum punya akun?": "New to Weekflow?",
  "Daftar": "Sign up",
  "Masuk sebagai": "Signed in as",
  "WAKTUNYA MENYUSUN ULANG": "TIME TO RESET",
  "Minggu ini": "This week",
  "Pilih minggu": "Pick a week",
  "Pilih minggu lain": "Pick another week",
  "Bulan sebelumnya": "Previous month",
  "Bulan berikutnya": "Next month",
  "Lompat ke minggu ini": "Jump to this week",
  "Tugas": "Tasks",
  "Perubahan tersimpan, tetapi daftar belum bisa dimuat ulang.": "Changes were saved, but the list could not be reloaded.",
  "Perubahan belum tersimpan. Coba lagi.": "Changes were not saved. Please try again.",
  "Tugas dipindahkan.": "Task moved.",
  "Tugas disimpan tanpa tanggal.": "Task saved without a date.",
  "Urutan tugas diperbarui.": "Task order updated.",
  "Coba lagi": "Try again",
  "Satu tugas selesai. Mantap.": "One task done. Nice work.",
  "Tugas dibuka kembali.": "Task reopened.",
  "Tugas dihapus.": "Task deleted.",
  "tugas": "tasks",
  "Tambah": "Add",
  "Satu minggu pada satu waktu.": "One week at a time.",
  "Perubahan disimpan.": "Changes saved.",
  "Tugas ditambahkan.": "Task added.",
  "Buka kembali": "Reopen",
  "Tandai": "Mark",
  "selesai": "complete",
  "Edit": "Edit",
  "Hapus": "Delete",
  "Pindah": "Move",
  "Pindahkan ke hari lain": "Move to another day",
  "Naikkan urutan": "Move up",
  "Turunkan urutan": "Move down",
  "Batal": "Cancel",
  "KELUAR": "SIGN OUT",
  "Keluar dari Weekflow?": "Sign out of Weekflow?",
  "Kamu perlu masuk lagi untuk membuka planner. Tugasmu tetap tersimpan di akunmu.": "You will need to sign in again to open your planner. Your tasks stay saved in your account.",
  "Ya, keluar": "Yes, sign out",
  "Keluar…": "Signing out…",
  "Simpan perubahan": "Save changes",
  "Simpan tugas": "Save task",
  "Menyimpan…": "Saving…",
  "Tulis judul agar tugas bisa disimpan.": "Add a title to save this task.",
  "Judul maksimal 200 karakter.": "Titles can be up to 200 characters.",
  "Belum tersimpan. Tulisanmu masih ada, coba lagi.": "Not saved. Your text is still here; try again.",
  "Tema diubah ke Terang.": "Theme changed to Light.",
  "Tema diubah ke Gelap.": "Theme changed to Dark.",
  "Tema mengikuti perangkat.": "Theme follows your device.",
  "Minggu dimulai hari Senin.": "Week now starts on Monday.",
  "Minggu dimulai hari Minggu.": "Week now starts on Sunday.",
  "Pengaturan disimpan di perangkat ini.": "Settings saved on this device.",
  "SEN": "MON",
  "SEL": "TUE",
  "RAB": "WED",
  "KAM": "THU",
  "JUM": "FRI",
  "SAB": "SAT",
  "MIN": "SUN",
  "Minggumu tidak harus sempurna. Cukup punya arah.": "Your week does not need to be perfect. It just needs a direction.",
  "Waktunya menyusun ulang": "Time to reset",
  "Kata sandi minimal 8 karakter.": "Password must contain at least 8 characters.",
  "Ada kendala. Coba lagi sebentar.": "Something went wrong. Please try again.",
  "Tugas harus berisi 1 sampai 200 karakter.": "Task titles must be 1 to 200 characters.",
  "Email atau kata sandi tidak sesuai.": "Email or password is incorrect.",
  "Akun dengan email ini sudah ada.": "An account with this email already exists.",
  "Tidak ada akun dengan email ini.": "No account exists with this email.",
  "Tema tampilan": "Appearance theme",
  "Hari pertama minggu": "First day of the week",
  "Buka planner mingguan": "Open weekly planner",
  "Menu akun": "Account menu",
  "Ubah bahasa": "Change language",
  "Inggris": "English",
  "Bahasa Indonesia": "Indonesian",
  "Change language to English": "Ubah bahasa ke Inggris",
  "Change language to Indonesian": "Ubah bahasa ke Indonesia",
  "Weekflow, beranda": "Weekflow, home",
  "Planner mingguan": "Weekly planner",
  "Satu akun, satu minggu yang lebih tertata.": "One account, a more organized week.",
  "Masuk untuk membuka planner mingguanmu.": "Sign in to open your weekly planner.",
  "Sebentar…": "One moment…",
  "Masuk ke Weekflow": "Sign in to Weekflow",
  "TANGKAP DULU": "CAPTURE IT FIRST",
  "RAPIKAN RENCANA": "REFINE YOUR PLAN",
  "Ubah tugas": "Edit task",
  "Tambahkan satu hal.": "Add one thing.",
  "Rencanamu boleh berubah bentuk.": "Your plans can change shape.",
  "Tidak perlu tahu semuanya sekarang.": "You do not need to figure it all out now.",
  "Simpan tanpa tanggal": "Save without a date",
  "RUANG PRIBADIMU": "YOUR PERSONAL SPACE",
  "Foto profil": "Profile photo",
  "PNG, JPG, atau WebP. Maksimal 2 MB.": "PNG, JPG or WebP. 2 MB maximum.",
  "Unggah foto": "Upload photo",
  "Ganti foto": "Change photo",
  "Hapus foto": "Remove photo",
  "Nama depan": "First name",
  "Nama belakang": "Last name",
  "Simpan profil": "Save profile",
  "Simpan foto": "Save photo",
  "Atur fotomu": "Adjust your photo",
  "Geser untuk memosisikan, lalu atur zoom.": "Drag to position, then adjust the zoom.",
  "FOTO PROFIL": "PROFILE PHOTO",
  "Profil disimpan.": "Profile saved.",
  "Foto dihapus.": "Photo removed.",
  "Foto diperbarui.": "Photo updated.",
  "Gunakan gambar PNG, JPG, atau WebP.": "Use a PNG, JPG or WebP image.",
  "Ukuran foto maksimal 2 MB.": "Photo size must be 2 MB or less.",
  "Foto gagal diproses. Coba gambar lain.": "Could not process the photo. Try another image.",
  "File ini bukan gambar yang valid.": "This file is not a valid image.",
  "Profil gagal disimpan.": "Could not save profile.",
  "Foto gagal dihapus.": "Could not remove photo.",
  "Perkecil": "Zoom out",
  "Perbesar": "Zoom in",
  "Zoom": "Zoom",
  "Area potong foto. Gunakan tombol panah untuk menggeser.": "Photo crop area. Use the arrow keys to move the image.",
  "Avatar must be 2 MB or smaller.": "Photo size must be 2 MB or less.",
  "Pengaturan sederhana,": "Simple settings,",
  "Pengaturan tampilan tersimpan di perangkat ini. Tugasmu tersimpan di akunmu.": "Display settings are saved on this device. Your tasks are saved to your account.",
  "Pikiranmu boleh mendarat di sini.": "Let your thoughts land here.",
  "Semua tugas sudah punya hari.": "Every task has a day.",
  "Masukkan alamat email yang valid.": "Enter a valid email address.",
  "Email ini sudah terdaftar. Coba masuk.": "This email is already registered. Try signing in.",
  "Masuk dengan Google belum berhasil. Coba lagi.": "Google sign-in did not work. Please try again.",
  "Mengalihkan ke Google…": "Redirecting to Google…",
  "Daftar dengan Google": "Sign up with Google",
  "Masuk dengan Google": "Continue with Google",
  "ATAU DENGAN EMAIL": "OR WITH EMAIL",
  "Email atau kata sandi tidak cocok.": "Email or password is incorrect.",
  "Terlalu banyak percobaan. Coba lagi sebentar.": "Too many attempts. Try again shortly.",
  "Masukkan email yang valid dan kata sandi minimal 8 karakter.": "Enter a valid email and a password of at least 8 characters.",
  "Data lokal tidak dapat dibaca.": "Local data could not be read.",
  "Penyimpanan browser penuh. Hapus beberapa tugas lalu coba lagi.": "Browser storage is full. Delete a few tasks and try again.",
  "Judul tugas harus 1–200 karakter.": "Task titles must be 1 to 200 characters.",
  "Tugas ini sudah tidak tersedia.": "This task is no longer available.",
  "Pilih satu hal yang paling penting": "Choose one thing that matters most",
  "Beri jeda di antara rencana": "Leave some breathing room between plans",
  "Catat ide untuk minggu depan": "Save an idea for next week",
  "UNTUK SEKARANG": "FOR NOW",
  "Rencana yang": "Plans that",
  "Tanggal baru": "New date",
  "Pindah ke atas": "Move up",
  "Pindah ke bawah": "Move down",
  "Hapus tugas": "Delete task",
  "FITUR": "FEATURES",
  "Semua hal kecil,": "All the small things,",
  "dalam satu minggu.": "in one week.",
  "Tidak ada dasbor rumit. Hanya hari, tugas, dan ruang untuk mengubah rencana.": "No complicated dashboard. Just days, tasks, and room to change your plans.",
  "Satu minggu sekaligus": "A whole week at once",
  "Tujuh hari terlihat bersamaan, jadi ritme minggu terlihat sebelum kamu menambah apa pun. Hari ini ditandai, dan tombol sebelumnya, berikutnya, serta minggu ini membawamu ke mana pun.": "Seven days sit side by side, so the shape of your week shows before you add anything. Today is marked, and previous, next and this week take you wherever you need to go.",
  "Catat dulu, jadwalkan nanti": "Capture now, schedule later",
  "Belum tahu kapan? Simpan tugas tanpa tanggal di daftar Belum dijadwalkan. Saat harinya jelas, pindahkan lewat tanggal di menu tugas, tanpa perlu menyeret.": "Not sure when? Keep it without a date in the Unscheduled list. When the day is clear, move it with the date field in the task menu, no dragging needed.",
  "3 tugas": "3 tasks",
  "Ubah judul, pindahkan tanggal, atur urutan, tandai selesai, lalu buka kembali kalau berubah pikiran. Semua lewat tombol yang bisa dijangkau keyboard.": "Rename it, move the date, reorder it, mark it done, then reopen it if you change your mind. Every action has a button you can reach from the keyboard.",
  "Kirim draf ke tim": "Send the team a draft",
  "Ritme, diatur sendiri": "A rhythm of your own",
  "Pilih tema terang, gelap, atau ikuti perangkat. Mulai minggu dari Senin atau Minggu, dan ganti bahasa kapan saja. Pengaturan tersimpan di perangkat ini.": "Pick a light or dark theme, or follow your device. Start the week on Monday or Sunday, and switch language anytime. Settings are saved on this device.",
  "Bahasa": "Language",
  "SATU MINGGU": "ONE WEEK",
  "PADA SATU WAKTU": "AT A TIME",
  "Dan hal-hal kecil lainnya: navigasi minggu, penanda hari ini, serta konfirmasi sebelum menghapus tugas.": "And the small things too: week navigation, a today marker, and a confirmation before a task is deleted.",
  "Tugasmu tersimpan di akun Weekflow, jadi tetap ada saat kamu masuk dari perangkat lain.": "Your tasks are saved to your Weekflow account, so they follow you to any device.",
  "Minggu yang lebih ringan,": "A lighter week,",
  "dimulai dari sini.": "starts here.",
  "Tidak perlu menyusun semuanya sekaligus. Mulai dari satu tugas, satu hari, satu minggu.": "You do not have to plan it all at once. Start with one task, one day, one week.",
  "Akun": "Account",
  "Fitur": "Features",
  "Kembali ke atas": "Back to top",
  "Tautan footer": "Footer links",
};

function LanguageControl() {
  useEffect(() => {
    const apply = () => {
      const english = localStorage.getItem("weekflow-language") === "en";
      document.documentElement.lang = english ? "en" : "id";
      document.title = english
        ? "Weekflow | Room for a lighter week"
        : "Weekflow | Ruang untuk minggu yang lebih ringan";
      const description = document.querySelector<HTMLMetaElement>('meta[name="description"]');
      if (description) description.content = english
        ? "A simple weekly planner to organize what needs to get done."
        : "Planner mingguan sederhana untuk merapikan hal yang perlu dilakukan.";
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
        if (element.classList.contains("language-toggle")) return;
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
      const toggleLabel = english ? "Change language to Indonesian" : "Change language to English";
      if (toggle?.getAttribute("aria-label") !== toggleLabel) toggle?.setAttribute("aria-label", toggleLabel);
    };
    const observer = new MutationObserver(apply);
    const reveal = () => document.documentElement.setAttribute("data-lang-ready", "");
    observer.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ["aria-label", "placeholder"] });
    apply();
    reveal();
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

export default function AppRouter({
  initialSession = null,
}: {
  initialSession?: LocalSession | null;
}) {
  return <AppRouterContent initialSession={initialSession} />;
}

function AppRouterContent({
  initialSession,
}: {
  initialSession: LocalSession | null;
}) {
  const path = usePathname() || "/";
  const router = useRouter();
  const { user, isLoading, signOut, refresh } = useAuth();
  const synced = useRef<string | null>(null);
  useEffect(() => {
    // One-time import of the Google name/photo for new accounts.
    if (!user || (user.prefs as Record<string, unknown> | undefined)?.profileSynced || synced.current === user.$id) return;
    synced.current = user.$id;
    syncProfile()
      .then(() => refresh())
      .catch(() => {
        synced.current = null;
      });
  }, [user, refresh]);
  const session = useMemo<LocalSession | null>(() => {
    // Until the client auth query settles, trust the server-verified session.
    if (isLoading) return initialSession;
    return user ? toLocalSession(user) : null;
  }, [user, isLoading, initialSession]);
  const sessionReady = !isLoading || initialSession !== null;
  const handleSignOut = () =>
    signOut.signOut({
      onSuccess: () => {
        router.replace("/login");
        router.refresh();
      },
    });

  const page = renderPage();
  return (
    <div className="page-fade" key={path === "/index" ? "/" : path}>
      {page}
    </div>
  );

  function renderPage() {
  if (path === "/" || path === "/index") return <Landing session={session} />;
  if (path === "/register" || path === "/login")
    return (
      <AuthScreen
        mode={path === "/register" ? "register" : "login"}
        onSuccess={() => {
          router.push("/planner");
          router.refresh();
        }}
      />
    );
  if (path === "/planner")
    return (
      <Planner
        session={session}
        sessionReady={sessionReady}
        onSignOut={handleSignOut}
        onProfileChanged={refresh}
      />
    );
  if (path === "/analytics")
    return (
      <AnalyticsPage
        session={session}
        sessionReady={sessionReady}
        onSignOut={handleSignOut}
      />
    );
  if (path === "/settings")
    return (
      <Settings
        session={session}
        sessionReady={sessionReady}
        onSignOut={handleSignOut}
        onProfileChanged={refresh}
      />
    );
  return (
    <main className="not-found">
      <Brand />
      <h1>Halaman ini belum tersedia</h1>
      <p>Periksa alamatnya, atau kembali ke minggumu.</p>
      <Link className="button button-primary" href={session ? "/planner" : "/"}>
        Kembali
      </Link>
    </main>
  );
  }
}

function useScrollReveal<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  useEffect(() => {
    const root = ref.current;
    if (!root || typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!("IntersectionObserver" in window)) return;
    const items = Array.from(
      root.querySelectorAll<HTMLElement>("[data-reveal]"),
    );
    if (!items.length) return;
    items.forEach((item) => item.classList.add("is-pending"));
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.remove("is-pending");
          entry.target.classList.add("is-revealed");
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" },
    );
    items.forEach((item) => observer.observe(item));
    return () => observer.disconnect();
  }, []);
  return ref;
}

const weekDayLabels = ["SEN", "SEL", "RAB", "KAM", "JUM", "SAB", "MIN"];

function LandingFeatures() {
  const revealRef = useScrollReveal<HTMLElement>();
  return (
    <section
      className="landing-features"
      id="fitur"
      aria-labelledby="features-heading"
      ref={revealRef}
    >
      <div className="features-intro" data-reveal>
        <span className="section-pill">FITUR</span>
        <h2 id="features-heading">
          Semua hal kecil, <em>dalam satu minggu.</em>
        </h2>
        <p>
          Tidak ada dasbor rumit. Hanya hari, tugas, dan ruang untuk mengubah
          rencana.
        </p>
      </div>
      <div className="feature-grid">
        <article className="feature-card" data-reveal>
          <div className="feature-visual mini-week" aria-hidden="true">
            <div className="mini-week-bar">
              <span>MINGGU INI</span>
              <span className="mini-nav">
                <FaArrowLeft />
                <FaArrowRight />
              </span>
            </div>
            <div className="mini-week-days">
              {weekDayLabels.map((day, index) => (
                <div
                  className={index === 3 ? "mini-day is-today" : "mini-day"}
                  key={day}
                >
                  <span>{day}</span>
                  <i className="mini-bar" />
                  <i className="mini-bar" />
                  {index === 3 && <em>Hari ini</em>}
                </div>
              ))}
            </div>
          </div>
          <div className="feature-copy">
            <h3>Satu minggu sekaligus</h3>
            <p>
              Tujuh hari terlihat bersamaan, jadi ritme minggu terlihat sebelum
              kamu menambah apa pun. Hari ini ditandai, dan tombol sebelumnya,
              berikutnya, serta minggu ini membawamu ke mana pun.
            </p>
          </div>
        </article>

        <article className="feature-card" data-reveal>
          <div className="feature-visual mini-inbox" aria-hidden="true">
            <div className="mini-inbox-head">
              <span className="mini-inbox-icon">
                <FaArrowDown />
              </span>
              <div>
                <strong>Belum dijadwalkan</strong>
                <span className="mini-count">3 tugas</span>
              </div>
            </div>
            <div className="mini-task">
              <span className="mini-check" />
              <span>Catat ide untuk minggu depan</span>
            </div>
            <div className="mini-task">
              <span className="mini-check" />
              <span>Beri jeda di antara rencana</span>
            </div>
            <div className="mini-task">
              <span className="mini-check" />
              <span>Pilih satu hal yang paling penting</span>
            </div>
          </div>
          <div className="feature-copy">
            <h3>Catat dulu, jadwalkan nanti</h3>
            <p>
              Belum tahu kapan? Simpan tugas tanpa tanggal di daftar Belum
              dijadwalkan. Saat harinya jelas, pindahkan lewat tanggal di menu
              tugas, tanpa perlu menyeret.
            </p>
          </div>
        </article>

        <article className="feature-card feature-card-wide" data-reveal>
          <div className="feature-copy">
            <h3>Rencana boleh berubah.</h3>
            <p>
              Ubah judul, pindahkan tanggal, atur urutan, tandai selesai, lalu
              buka kembali kalau berubah pikiran. Semua lewat tombol yang bisa
              dijangkau keyboard.
            </p>
          </div>
          <div className="feature-visual mini-board" aria-hidden="true">
            <div className="mini-day-column">
              <span className="mini-day-title">KAM</span>
              <div className="mini-task is-selected">
                <span className="mini-check" />
                <span>Kirim draf ke tim</span>
                <span className="mini-dots">
                  <FaEllipsisH />
                </span>
              </div>
              <div className="mini-task">
                <span className="mini-check is-done">
                  <FaCheck />
                </span>
                <span>Rencana yang cukup</span>
              </div>
            </div>
            <div className="mini-menu">
              <span className="mini-menu-label">Tanggal baru</span>
              <span className="mini-menu-input">20 / 11 / 2026</span>
              <span>Simpan tanpa tanggal</span>
              <span>Pindah ke atas</span>
              <span>Pindah ke bawah</span>
            </div>
          </div>
        </article>

        <article className="feature-card feature-card-narrow" data-reveal>
          <div className="feature-visual mini-prefs" aria-hidden="true">
            <div className="mini-pref-row">
              <span>Tampilan</span>
              <span className="mini-chip is-active">Terang</span>
              <span className="mini-chip">Gelap</span>
              <span className="mini-chip">Ikuti perangkat</span>
            </div>
            <div className="mini-pref-row">
              <span>Awal minggu</span>
              <span className="mini-chip is-active">Senin</span>
              <span className="mini-chip">Minggu</span>
            </div>
            <div className="mini-pref-row">
              <span>Bahasa</span>
              <span className="mini-chip">ID</span>
              <span className="mini-chip">EN</span>
            </div>
          </div>
          <div className="feature-copy">
            <h3>Ritme, diatur sendiri</h3>
            <p>
              Pilih tema terang, gelap, atau ikuti perangkat. Mulai minggu dari
              Senin atau Minggu, dan ganti bahasa kapan saja. Pengaturan tersimpan di perangkat ini.
            </p>
          </div>
        </article>
      </div>
      <p className="features-more" data-reveal>
        Dan hal-hal kecil lainnya: navigasi minggu, penanda hari ini, serta
        konfirmasi sebelum menghapus tugas.
      </p>
      <p className="features-note" data-reveal>
        Tugasmu tersimpan di akun Weekflow, jadi tetap ada saat kamu masuk dari
        perangkat lain.
      </p>
    </section>
  );
}

function Landing({ session }: { session: LocalSession | null }) {
  return (
    <main className="landing-shell" id="top">
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
              Gratis dipakai · Dirancang untuk keperluan pribadi
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
      <LandingFeatures />
      <LandingFooter session={session} />
    </main>
  );
}

function LandingFooter({ session }: { session: LocalSession | null }) {
  return (
    <footer className="landing-footer">
      <div className="footer-card">
        <div className="footer-top">
          <div className="footer-brand">
            <Brand />
            <h2 className="footer-heading">
              Minggu yang lebih ringan,
              <br />
              <em>dimulai dari sini.</em>
            </h2>
            <p className="footer-lede">
              Tidak perlu menyusun semuanya sekaligus. Mulai dari satu tugas,
              satu hari, satu minggu.
            </p>
            <Link
              className="button button-primary footer-cta"
              href={session ? "/planner" : "/register"}
            >
              {session ? "Buka planner" : "Susun minggu saya"}
              <FaArrowRight aria-hidden="true" />
            </Link>
          </div>
          <nav className="footer-links" aria-label="Tautan footer">
            <div>
              <h3>Planner</h3>
              <ul>
                <li>
                  <Link href="/planner">
                    <FaArrowRight aria-hidden="true" />
                    Minggu ini
                  </Link>
                </li>
                <li>
                  <Link href="/planner">
                    <FaArrowRight aria-hidden="true" />
                    Belum dijadwalkan
                  </Link>
                </li>
                <li>
                  <Link href="/settings">
                    <FaArrowRight aria-hidden="true" />
                    Pengaturan
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3>Akun</h3>
              <ul>
                <li>
                  <Link href={session ? "/planner" : "/login"}>
                    <FaArrowRight aria-hidden="true" />
                    Masuk
                  </Link>
                </li>
                <li>
                  <Link href="/register">
                    <FaArrowRight aria-hidden="true" />
                    Daftar
                  </Link>
                </li>
              </ul>
            </div>
          </nav>
        </div>
        <div className="footer-art" aria-hidden="true">
          <span className="footer-tile tile-sun">
            <FaSun />
          </span>
          <span className="footer-tile tile-week">7</span>
          <span className="footer-tile tile-check">
            <FaCheck />
          </span>
          <span className="footer-tile tile-plus">
            <FaPlus />
          </span>
          <span className="footer-tile tile-menu">
            <FaEllipsisH />
          </span>
          <span className="footer-tile tile-next">
            <FaArrowRight />
          </span>
          <span className="footer-tile tile-up">
            <FaArrowUp />
          </span>
          <span className="footer-tile tile-circle">
            <FaRegCircle />
          </span>
        </div>
        <div className="footer-bottom">
          <span>© 2026 Weekflow</span>
          <div>
            <Link href="#fitur">Fitur</Link>
            <Link href="#top">Kembali ke atas</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

function authErrorMessage(error: Error) {
  const type = (error as { type?: string }).type;
  const code = (error as { code?: number }).code;
  if (type === "user_already_exists" || code === 409)
    return "Email ini sudah terdaftar. Coba masuk.";
  if (type === "user_invalid_credentials" || code === 401)
    return "Email atau kata sandi tidak cocok.";
  if (type === "general_rate_limit_exceeded" || code === 429)
    return "Terlalu banyak percobaan. Coba lagi sebentar.";
  if (code === 400) return "Masukkan email yang valid dan kata sandi minimal 8 karakter.";
  return "Ada kendala. Coba lagi sebentar.";
}

function AuthScreen({
  mode,
  onSuccess,
}: {
  mode: "register" | "login";
  onSuccess: () => void;
}) {
  const router = useRouter();
  const { signIn, signUp } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const isRegister = mode === "register";
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("error") === "oauth")
      setError("Masuk dengan Google belum berhasil. Coba lagi.");
  }, []);
  const continueWithGoogle = () => {
    setError("");
    setGoogleBusy(true);
    signIn.oAuth({
      provider: OAuthProvider.Google,
      onError: () => {
        setGoogleBusy(false);
        setError("Masuk dengan Google belum berhasil. Coba lagi.");
      },
    });
  };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    setError("");
    if (password.length < 8) {
      setError("Kata sandi minimal 8 karakter.");
      return;
    }
    setBusy(true);
    const cleanEmail = email.trim().toLowerCase();
    const fail = (reason: Error) => {
      setBusy(false);
      setError(authErrorMessage(reason));
    };
    if (isRegister)
      signUp.emailPassword({
        email: cleanEmail,
        password,
        name: cleanEmail.split("@")[0],
        onSuccess,
        onError: fail,
      });
    else
      signIn.emailPassword({
        email: cleanEmail,
        password,
        onSuccess,
        onError: fail,
      });
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
          <button
            className="button google-button"
            type="button"
            onClick={continueWithGoogle}
            disabled={googleBusy || busy}
          >
            <FaGoogle aria-hidden="true" />
            <span>
              {googleBusy
                ? "Mengalihkan ke Google…"
                : isRegister
                  ? "Daftar dengan Google"
                  : "Masuk dengan Google"}
            </span>
          </button>
          <div className="auth-divider auth-divider-top" aria-hidden="true">
            <span />
            ATAU DENGAN EMAIL
            <span />
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
            <div className="password-field">
              <input
                autoComplete={isRegister ? "new-password" : "current-password"}
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder="Minimal 8 karakter"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                minLength={8}
              />
              <button
                className="password-toggle"
                type="button"
                aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
                aria-pressed={showPassword}
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <FaEyeSlash aria-hidden="true" /> : <FaEye aria-hidden="true" />}
              </button>
            </div>
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
          <div className="auth-bottom">
            <span>Weekflow · Planner yang memberi ruang</span>
          </div>
        </div>
      </section>
    </main>
  );
}

type ViewTransitionDoc = Document & {
  startViewTransition?: (update: () => void) => { finished: Promise<unknown> };
};
/** Morph between layouts with the View Transitions API; false when unsupported. */
const morph = (update: () => void, before?: () => void, after?: () => void) => {
  const doc = document as ViewTransitionDoc;
  if (
    !doc.startViewTransition ||
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  )
    return false;
  before?.();
  const transition = doc.startViewTransition(() => flushSync(update));
  transition.finished.finally(() => after?.());
  return true;
};

function Planner({
  session,
  sessionReady,
  onSignOut,
  onProfileChanged,
}: {
  session: LocalSession | null;
  sessionReady: boolean;
  onSignOut: () => void;
  onProfileChanged: () => Promise<unknown> | void;
}) {
  const router = useRouter();
  const [anchor, setAnchor] = useState(() => mondayOf(new Date()));
  const [weekStarts, setWeekStarts] = useState(1);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [unscheduled, setUnscheduled] = useState<Task[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [activeDay, setActiveDay] = useState(todayKey);
  const [showUnscheduled, setShowUnscheduled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [editor, setEditor] = useState<{
    task?: Task;
    date: string | null;
  } | null>(null);
  const [status, setStatus] = useState("");
  const [failure, setFailure] = useState(false);
  const [notice, setNotice] = useState("");
  // Focus mode lives in the URL (?day=YYYY-MM-DD) but never leaves the page.
  const [focus, setFocus] = useState<{ day: string; from: DOMRect | null } | null>(null);
  const [returning, setReturning] = useState<{ day: string; from: DOMRect; morph: boolean } | null>(null);
  const focusEl = useRef<HTMLElement | null>(null);
  const focusDay = useRef<string | null>(null);
  const pushedFocus = useRef(false);
  useEffect(() => {
    focusDay.current = focus?.day ?? null;
  }, [focus]);
  const syncFocus = useCallback(() => {
    const raw = new URLSearchParams(window.location.search).get("day");
    const day = raw && /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : null;
    const current = focusDay.current;
    if (day === current) return;
    if (!day && current && focusEl.current) {
      const from = focusEl.current.getBoundingClientRect();
      focusDay.current = null;
      const done = morph(() => {
        setReturning({ day: current, from, morph: true });
        setFocus(null);
      });
      if (done) return;
      setReturning({ day: current, from, morph: false });
    }
    if (day) {
      const date = fromKey(day);
      setAnchor((now) => {
        const start = mondayOf(now, weekStartsRef.current);
        return day >= dayKey(start) && day <= dayKey(shift(start, 6)) ? now : date;
      });
      setActiveDay(day);
    }
    focusDay.current = day;
    setFocus(day ? { day, from: null } : null);
  }, []);
  const weekStartsRef = useRef(1);
  useEffect(() => {
    weekStartsRef.current = weekStarts;
  }, [weekStarts]);
  useEffect(() => {
    syncFocus();
    window.addEventListener("popstate", syncFocus);
    return () => window.removeEventListener("popstate", syncFocus);
  }, [syncFocus]);
  const openFocus = (day: string, from: DOMRect) => {
    const url = new URL(window.location.href);
    url.searchParams.set("day", day);
    window.history.pushState(null, "", url);
    pushedFocus.current = true;
    focusDay.current = day;
    setActiveDay(day);
    const column = document.getElementById(`col-${day}`);
    const done = morph(
      () => setFocus({ day, from: null }),
      () => {
        if (column) column.style.viewTransitionName = "focus-card";
      },
    );
    if (!done) setFocus({ day, from });
  };
  const closeFocus = () => {
    if (pushedFocus.current) {
      pushedFocus.current = false;
      window.history.back();
      return;
    }
    const url = new URL(window.location.href);
    url.searchParams.delete("day");
    window.history.replaceState(null, "", url);
    syncFocus();
  };
  const stepFocus = (direction: -1 | 1) => {
    if (!focus) return;
    const day = dayKey(shift(fromKey(focus.day), direction));
    const url = new URL(window.location.href);
    url.searchParams.set("day", day);
    window.history.replaceState(null, "", url);
    syncFocus();
  };
  useLayoutEffect(() => {
    if (!returning || !loaded || failure || focus) return;
    const column = document.getElementById(`col-${returning.day}`);
    setReturning(null);
    if (column && returning.morph) {
      column.style.viewTransitionName = "focus-card";
      window.setTimeout(() => {
        column.style.viewTransitionName = "";
      }, 1200);
      return;
    }
    if (!column || window.matchMedia("(prefers-reduced-motion: reduce)").matches)
      return;
    const to = column.getBoundingClientRect();
    if (!to.width || !to.height) return;
    column.animate(
      [
        {
          zIndex: 3,
          transformOrigin: "top left",
          transform: `translate(${returning.from.left - to.left}px, ${returning.from.top - to.top}px) scale(${returning.from.width / to.width}, ${returning.from.height / to.height})`,
        },
        { zIndex: 3, transformOrigin: "top left", transform: "none" },
      ],
      { duration: 460, easing: "cubic-bezier(.2,.8,.2,1)" },
    );
  }, [returning, loaded, failure, focus]);

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
    Promise.all([
      listTasks(dayKey(start), dayKey(end)),
      listUnscheduledTasks(),
    ])
      .then(([week, loose]) => {
        if (canceled) return;
        setTasks(week);
        setUnscheduled(loose);
        setLoaded(true);
      })
      .catch(() => {
        if (canceled) return;
        setFailure(true);
        setLoaded(true);
      });
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
  const orderedFor = (date: string) =>
    tasks
      .filter((task) => task.scheduledDate === date)
      .sort((a, b) => a.position - b.position);
  const weekLabel = `${dateLabel(dates[0], { day: "numeric", month: "long" })} ${isEnglish() ? "to" : "sampai"} ${dateLabel(dates[6], { day: "numeric", month: "long", year: "numeric" })}`;
  const saved = (message: string) => {
    setStatus(message);
    window.setTimeout(() => setStatus(""), 2600);
  };
  const pending = useRef(0);
  const latest = useRef({ tasks, unscheduled });
  useEffect(() => {
    latest.current = { tasks, unscheduled };
  });
  const refresh = async () => {
    const start = mondayOf(anchor, weekStarts);
    const [week, loose] = await Promise.all([
      listTasks(dayKey(start), dayKey(shift(start, 6))),
      listUnscheduledTasks(),
    ]);
    // Skip while optimistic edits are in flight so they are not reverted.
    if (pending.current > 0) return;
    setTasks(week);
    setUnscheduled(loose);
  };
  type Optimistic = (list: Task[], kind: "week" | "loose") => Task[];
  const runMutation = async (
    work: () => Promise<unknown>,
    message: string,
    optimistic?: Optimistic,
  ) => {
    if (!session) return false;
    const snapshot = latest.current;
    pending.current += 1;
    if (optimistic) {
      setTasks((list) => optimistic(list, "week"));
      setUnscheduled((list) => optimistic(list, "loose"));
    }
    try {
      await work();
    } catch {
      pending.current -= 1;
      setNotice("Perubahan belum tersimpan. Coba lagi.");
      if (optimistic) {
        try {
          await refresh();
        } catch {
          setTasks(snapshot.tasks);
          setUnscheduled(snapshot.unscheduled);
        }
      }
      return false;
    }
    pending.current -= 1;
    if (optimistic) {
      saved(message);
      refresh().catch(() =>
        setNotice("Perubahan tersimpan, tetapi daftar belum bisa dimuat ulang."),
      );
      return true;
    }
    try {
      await refresh();
    } catch {
      setNotice("Perubahan tersimpan, tetapi daftar belum bisa dimuat ulang.");
      return true;
    }
    saved(message);
    return true;
  };
  const patchLocal =
    (id: string, changes: Partial<Task>): Optimistic =>
    (list) =>
      list.map((item) => (item.id === id ? { ...item, ...changes } : item));
  const setPriority = (task: Task, priority: Priority) =>
    task.priority === priority
      ? undefined
      : runMutation(
          () => setTaskPriority(task.id, priority),
          isEnglish() ? "Priority updated." : "Prioritas diperbarui.",
          patchLocal(task.id, { priority }),
        );
  const toggleTask = (task: Task) =>
    runMutation(
      () => setTaskCompletion(task.id, !task.completed),
      task.completed ? "Tugas dibuka kembali." : "Satu tugas selesai. Mantap.",
      patchLocal(task.id, { completed: !task.completed }),
    );
  const removeTask = (task: Task) =>
    runMutation(
      () => deleteTask(task.id),
      "Tugas dihapus.",
      (list) => list.filter((item) => item.id !== task.id),
    );
  const openCreate = (date: string | null) => {
    if (!date) setShowUnscheduled(true);
    setEditor({ date });
  };
  const move = (task: Task, date: string | null) => {
    if (!date) setShowUnscheduled(true);
    const weekKeys = dates.map(dayKey);
    return runMutation(
      () => moveTask(task.id, date),
      date ? "Tugas dipindahkan." : "Tugas disimpan tanpa tanggal.",
      (list, kind) => {
        const rest = list.filter((item) => item.id !== task.id);
        const belongs = date ? weekKeys.includes(date) : false;
        if ((kind === "week") !== belongs) return rest;
        const position =
          rest
            .filter((item) => item.scheduledDate === date)
            .reduce((max, item) => Math.max(max, item.position), 0) + 1;
        return [...rest, { ...task, scheduledDate: date, position }];
      },
    );
  };
  const shiftTask = (task: Task, direction: -1 | 1) => {
    const list = (
      task.scheduledDate
        ? tasks.filter((item) => item.scheduledDate === task.scheduledDate)
        : [...unscheduled]
    ).sort((a, b) => a.position - b.position);
    const neighbour = list[list.findIndex((item) => item.id === task.id) + direction];
    if (!neighbour) return;
    return runMutation(
      () => reorderTask(task, neighbour),
      "Urutan tugas diperbarui.",
      (items) =>
        items.map((item) =>
          item.id === task.id
            ? { ...item, position: neighbour.position }
            : item.id === neighbour.id
              ? { ...item, position: task.position }
              : item,
        ),
    );
  };
  if (!sessionReady || !session)
    return (
      <div className="loading-page">
        <div className="skeleton skeleton-header" />
        <div className="skeleton skeleton-title" />
        <div className="skeleton skeleton-grid" />
      </div>
    );
  return (
    <WeekStartContext.Provider value={weekStarts}>
    <div className="app-shell">
      <header className="app-header">
        <Brand />
        <div className="header-right">
          <LanguageControl />
          <div className="account-wrap">
            <button
              className="account-button"
              type="button"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen(!menuOpen)}
            >
              <Avatar session={session} className="account-avatar" />
              <span className="account-email">{session.name}</span>
              <FaChevronDown aria-hidden="true" />
            </button>
            {menuOpen && (
              <div className="account-menu">
                <div className="menu-email">
                  Masuk sebagai
                  <br />
                  <strong>{session.email}</strong>
                </div>
                <Link href="/analytics" onClick={() => setMenuOpen(false)}>
                  Analitik <FaExternalLinkAlt aria-hidden="true" />
                </Link>
                <Link href="/settings" onClick={() => setMenuOpen(false)}>
                  Pengaturan <FaExternalLinkAlt aria-hidden="true" />
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    setConfirmLogout(true);
                  }}
                >
                  Keluar <FaExternalLinkAlt aria-hidden="true" />
                </button>
              </div>
            )}
          </div>
        </div>
      </header>
      <main className="planner-main">
        {focus && fromKey(focus.day) && (
          <FocusView
            date={fromKey(focus.day)}
            from={focus.from}
            elRef={focusEl}
            loaded={loaded && !failure}
            tasks={orderedFor(focus.day)}
            onClose={closeFocus}
            onStep={stepFocus}
            onAdd={() => openCreate(focus.day)}
            onPriority={setPriority}
            renderCard={(task, index, list) => (
              <TaskCard
                key={task.id}
                task={task}
                onToggle={() => toggleTask(task)}
                onEdit={() => setEditor({ task, date: focus.day })}
                onDelete={() => {
                  if (window.confirm(isEnglish() ? `Delete “${task.title}”?` : `Hapus “${task.title}”?`))
                    removeTask(task);
                }}
                onMove={move}
                onShift={(direction) => shiftTask(task, direction)}
                canUp={index > 0}
                canDown={index < list.length - 1}
                onPriority={(priority) => setPriority(task, priority)}
                detailed
              />
            )}
          />
        )}
        {!focus && (<>
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
              <div className="week-picker-group">
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
                <WeekPicker
                  selectedStart={weekStart}
                  weekStarts={weekStarts}
                  onPick={(date) => {
                    setAnchor(date);
                    setActiveDay(dayKey(date));
                  }}
                />
              </div>
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
                <p>Coba lagi sebentar lagi. Tugasmu tetap aman.</p>
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
                    id={`col-${key}`}
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
                      <div className="day-heading-end">
                        {key === todayKey && (
                          <span className="today-tag">Hari ini</span>
                        )}
                        <button
                          className="day-focus"
                          type="button"
                          aria-label={`${isEnglish() ? "Focus on" : "Fokus pada"} ${dateLabel(date, { weekday: "long", day: "numeric", month: "long" })}`}
                          title={isEnglish() ? "Focus on this day" : "Fokus ke hari ini"}
                          onClick={(event) =>
                            openFocus(
                              key,
                              event.currentTarget
                                .closest(".day-column")!
                                .getBoundingClientRect(),
                            )
                          }
                        >
                          <FaEye aria-hidden="true" />
                        </button>
                      </div>
                    </header>
                    <div className="task-list">
                      {dayTasks.length ? (
                        dayTasks.map((task, index) => (
                          <TaskCard
                            key={task.id}
                            task={task}
                            onToggle={() => toggleTask(task)}
                            onEdit={() => setEditor({ task, date: key })}
                            onDelete={() => {
                              if (window.confirm(isEnglish() ? `Delete “${task.title}”?` : `Hapus “${task.title}”?`))
                                removeTask(task);
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
                      <FaPlus aria-hidden="true" /> Tambah tugas
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
              {isEnglish()
                ? unscheduled.length === 1 ? "task" : "tasks"
                : "tugas"}
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
                  onToggle={() => toggleTask(task)}
                  onEdit={() => setEditor({ task, date: null })}
                  onDelete={() => {
                    if (window.confirm(isEnglish() ? `Delete “${task.title}”?` : `Hapus “${task.title}”?`))
                      removeTask(task);
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
                  {tasks.length
                    ? "Semua tugas sudah punya hari."
                    : "Pikiranmu boleh mendarat di sini."}
                </strong>
                <p>Tugas yang belum punya hari tetap punya tempat.</p>
              </div>
              <button className="text-button" onClick={() => openCreate(null)}>
                Tulis satu tugas <FaArrowRight aria-hidden="true" />
              </button>
            </div>
          )}
        </section>
        <AnalyticsPeek
          tasks={tasks}
          keys={dates.map(dayKey)}
          loaded={loaded && !failure}
        />
        <footer className="planner-footer">
          <span>
            <span className="footer-flower" aria-hidden="true">
              <FaSun />
            </span>{" "}
            Satu minggu pada satu waktu.
          </span>
          <span>Rencana yang baik memberi ruang untuk berubah.</span>
        </footer>
        </>)}
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
      {confirmLogout && (
        <LogoutDialog
          onCancel={() => setConfirmLogout(false)}
          onConfirm={onSignOut}
        />
      )}
      {editor && (
        <TaskEditor
          task={editor.task}
          initialDate={editor.date}
          onClose={() => setEditor(null)}
          onSave={async (details) => {
            if (!session) return false;
            const ok = await runMutation(
              () =>
                editor.task
                  ? updateTask(editor.task.id, details)
                  : createTask(details),
              editor.task ? "Perubahan disimpan." : "Tugas ditambahkan.",
            );
            return ok;
          }}
        />
      )}
    </div>
    </WeekStartContext.Provider>
  );
}

function FocusView({
  date,
  from,
  elRef,
  loaded,
  tasks,
  renderCard,
  onPriority,
  onClose,
  onStep,
  onAdd,
}: {
  date: Date;
  from: DOMRect | null;
  elRef: { current: HTMLElement | null };
  loaded: boolean;
  tasks: Task[];
  renderCard: (task: Task, index: number, list: Task[]) => ReactNode;
  onPriority: (task: Task, priority: Priority) => void;
  onClose: () => void;
  onStep: (direction: -1 | 1) => void;
  onAdd: () => void;
}) {
  const [view, setView] = useState<"list" | "board">("list");
  const [dragOver, setDragOver] = useState<Priority | null>(null);
  useEffect(() => {
    try {
      if (localStorage.getItem("weekflow-focus-view") === "board") setView("board");
    } catch {}
  }, []);
  const changeView = (next: "list" | "board") => {
    setView(next);
    try {
      localStorage.setItem("weekflow-focus-view", next);
    } catch {}
  };
  const total = tasks.length;
  const done = tasks.filter((task) => task.completed).length;
  const local = useRef<HTMLElement | null>(null);
  const key = dayKey(date);
  // Scale the view out of the week column it was opened from.
  useLayoutEffect(() => {
    const el = local.current;
    elRef.current = el;
    if (!el || !from || window.matchMedia("(prefers-reduced-motion: reduce)").matches)
      return;
    const to = el.getBoundingClientRect();
    if (!to.width || !to.height) return;
    el.animate(
      [
        {
          transformOrigin: "top left",
          transform: `translate(${from.left - to.left}px, ${from.top - to.top}px) scale(${from.width / to.width}, ${from.height / to.height})`,
        },
        { transformOrigin: "top left", transform: "none" },
      ],
      { duration: 520, easing: "cubic-bezier(.2,.8,.2,1)" },
    );
    return () => {
      elRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || document.querySelector(".task-dialog, .task-menu")) return;
      onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  // Slide direction for the day swap: +1 forward, -1 back.
  const previous = useRef(key);
  const direction = key > previous.current ? 1 : key < previous.current ? -1 : 0;
  useEffect(() => {
    previous.current = key;
  }, [key]);
  const english = isEnglish();
  const percent = total ? Math.round((done / total) * 100) : 0;
  return (
    <section
      ref={(node) => {
        local.current = node;
        elRef.current = node;
      }}
      className={`focus-view${key === todayKey ? " is-today" : ""}`}
      aria-labelledby="focus-title"
    >
      <div className={`focus-body${view === "board" ? " is-board" : ""}`}>
        <div className="focus-bar">
          <button className="button button-soft" type="button" onClick={onClose}>
            <FaArrowLeft aria-hidden="true" /> {english ? "Back to week" : "Kembali ke minggu"}
          </button>
          <div className="view-toggle" role="radiogroup" aria-label={english ? "Display" : "Tampilan"}>
            {(["list", "board"] as const).map((value) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={view === value}
                className={view === value ? "is-selected" : ""}
                onClick={() => changeView(value)}
              >
                {value === "list" ? <FaListUl aria-hidden="true" /> : <FaColumns aria-hidden="true" />}
                {value === "list" ? (english ? "List" : "Daftar") : "Kanban"}
              </button>
            ))}
          </div>
          <div className="focus-steps">
            <button
              className="icon-button"
              type="button"
              aria-label={english ? "Previous day" : "Hari sebelumnya"}
              onClick={() => onStep(-1)}
            >
              <FaChevronLeft aria-hidden="true" />
            </button>
            <button
              className="icon-button"
              type="button"
              aria-label={english ? "Next day" : "Hari berikutnya"}
              onClick={() => onStep(1)}
            >
              <FaChevronRight aria-hidden="true" />
            </button>
          </div>
        </div>
        <div
          key={key}
          className="focus-swap"
          style={{ "--dir": direction } as React.CSSProperties}
        >
        <div className="focus-head">
          <div className="focus-title-row">
            <div>
          <span className="week-overline">
            {key === todayKey
              ? english ? "FOCUS · TODAY" : "FOKUS · HARI INI"
              : english ? "FOCUS" : "FOKUS"}
          </span>
          <h1 id="focus-title">
            {dateLabel(date, { weekday: "long" })}
            <em>{dateLabel(date, { day: "numeric", month: "long", year: "numeric" })}</em>
          </h1>
            </div>
            <button className="button button-primary focus-add" type="button" onClick={onAdd}>
              <FaPlus aria-hidden="true" /> {english ? "Add task" : "Tambah tugas"}
            </button>
          </div>
          <div className="focus-progress">
            <div className="focus-meter" aria-hidden="true">
              <i style={{ width: `${percent}%` }} />
            </div>
            <span>
              {english
                ? `${done} of ${total} done`
                : `${done} dari ${total} selesai`}
            </span>
          </div>
        </div>
        {!loaded ? (
          <div className="focus-list">
            <div className="skeleton skeleton-day" />
          </div>
        ) : view === "board" ? (
          <div className="kanban">
            {(["high", "medium", "low"] as Priority[]).map((column) => {
              const items = tasks.filter((task) => task.priority === column);
              return (
                <section
                  key={column}
                  className={`kanban-column is-${column}${dragOver === column ? " is-over" : ""}`}
                  aria-label={priorityLabel(column)}
                  onDragOver={(event) => {
                    event.preventDefault();
                    setDragOver(column);
                  }}
                  onDragLeave={(event) => {
                    if (!event.currentTarget.contains(event.relatedTarget as Node))
                      setDragOver(null);
                  }}
                  onDrop={(event) => {
                    event.preventDefault();
                    setDragOver(null);
                    const id = event.dataTransfer.getData("text/plain");
                    const task = tasks.find((item) => item.id === id);
                    if (task) onPriority(task, column);
                  }}
                >
                  <header className="kanban-head">
                    <span className={`priority-tag is-${column}`}>
                      <i aria-hidden="true" />
                      {priorityLabel(column)}
                    </span>
                    <span className="kanban-count">{items.length}</span>
                  </header>
                  <div className="kanban-cards">
                    {items.map((task) => (
                      <div
                        key={task.id}
                        className="kanban-item"
                        draggable
                        onDragStart={(event) => {
                          event.dataTransfer.setData("text/plain", task.id);
                          event.dataTransfer.effectAllowed = "move";
                        }}
                      >
                        {renderCard(task, tasks.indexOf(task), tasks)}
                      </div>
                    ))}
                    {!items.length && (
                      <p className="kanban-empty">
                        {english ? "Drop a task here" : "Taruh tugas di sini"}
                      </p>
                    )}
                  </div>
                </section>
              );
            })}
          </div>
        ) : total ? (
          <div className="focus-list">
            {tasks.map((task, index) => renderCard(task, index, tasks))}
          </div>
        ) : (
          <div className="day-empty focus-empty">
            <span aria-hidden="true"><FaSun /></span>
            <p>{english ? "Room for something new." : "Ruang untuk hal baru."}</p>
          </div>
        )}
        </div>
      </div>
    </section>
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
  detailed = false,
  onPriority,
}: {
  task: Task;
  detailed?: boolean;
  onPriority?: (priority: Priority) => void;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onMove: (task: Task, date: string | null) => void;
  onShift: (direction: -1 | 1) => void;
  canUp: boolean;
  canDown: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [picking, setPicking] = useState(false);
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
  }, [open, picking]);
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
    <article
      className={`task-card${task.completed ? " task-completed" : ""}${detailed ? " has-detail" : ""}`}
    >
      <button
        className="task-check"
        type="button"
        aria-label={
          task.completed
            ? `${isEnglish() ? "Reopen" : "Buka kembali"} ${task.title}`
            : `${isEnglish() ? "Mark" : "Tandai"} ${task.title} ${isEnglish() ? "complete" : "selesai"}`
        }
        aria-pressed={task.completed}
        onClick={onToggle}
      >
        {task.completed ? <FaCheck aria-hidden="true" /> : null}
      </button>
      <button className="task-title" type="button" onClick={onEdit}>
        {task.title}
      </button>
      <span
        className={`priority-tag is-${task.priority}`}
        title={priorityLabel(task.priority)}
        aria-label={`${isEnglish() ? "Priority" : "Prioritas"}: ${priorityLabel(task.priority)}`}
      >
        <i aria-hidden="true" />
        {detailed && priorityLabel(task.priority)}
      </span>
      <div className="task-menu-wrap">
        <button
          ref={triggerRef}
          className="task-menu-trigger"
          aria-label={`${isEnglish() ? "Options for" : "Opsi untuk"} ${task.title}`}
          aria-expanded={open}
          onClick={(event) => {
            if (!open) {
              const rect = event.currentTarget.getBoundingClientRect();
              setMenuPosition({
                top: Math.max(8, Math.min(rect.bottom + 4, window.innerHeight - 340)),
                left: Math.max(8, Math.min(rect.right - 224, window.innerWidth - 232)),
              });
            }
            setPicking(false);
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
            <button
              type="button"
              aria-expanded={picking}
              onClick={() => setPicking(!picking)}
            >
              Tanggal baru
              <FaChevronDown aria-hidden="true" />
            </button>
            {picking && (
              <CalendarGrid
                value={task.scheduledDate ?? ""}
                onPick={(key) => {
                  onMove(task, key);
                  setOpen(false);
                }}
              />
            )}
            {onPriority && (
              <div className="menu-priority" role="group" aria-label={isEnglish() ? "Priority" : "Prioritas"}>
                {(["high", "medium", "low"] as Priority[]).map((value) => (
                  <button
                    key={value}
                    type="button"
                    className={`priority-tag is-${value}${task.priority === value ? " is-current" : ""}`}
                    onClick={() => {
                      onPriority(value);
                      setOpen(false);
                    }}
                  >
                    <i aria-hidden="true" />
                    {priorityLabel(value)}
                  </button>
                ))}
              </div>
            )}
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
      {detailed && task.description && (
        <div className="task-detail">
          <p className="task-description">{task.description}</p>
        </div>
      )}
    </article>
  );
}

function WeekPicker({
  selectedStart,
  weekStarts,
  onPick,
}: {
  selectedStart: Date;
  weekStarts: number;
  onPick: (date: Date) => void;
}) {
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(
    () => new Date(selectedStart.getFullYear(), selectedStart.getMonth(), 1),
  );
  const wrapRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);
  const toggle = () => {
    if (!open)
      setMonth(
        new Date(selectedStart.getFullYear(), selectedStart.getMonth(), 1),
      );
    setOpen(!open);
  };
  const first = mondayOf(month, weekStarts);
  const weeks: Date[][] = [];
  for (let row = 0; row < 6; row += 1) {
    const start = shift(first, row * 7);
    if (row >= 4 && start.getMonth() !== month.getMonth() && start > month)
      break;
    weeks.push(Array.from({ length: 7 }, (_, index) => shift(start, index)));
  }
  const selectedKey = dayKey(selectedStart);
  return (
    <div className="week-picker" ref={wrapRef}>
      <button
        ref={triggerRef}
        className="icon-button week-picker-trigger"
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label="Pilih minggu lain"
        onClick={toggle}
      >
        <FaChevronDown aria-hidden="true" />
      </button>
      {open && (
        <div className="week-picker-popover" role="dialog" aria-label="Pilih minggu">
          <div className="wp-head">
            <button
              type="button"
              className="wp-nav"
              aria-label="Bulan sebelumnya"
              onClick={() =>
                setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))
              }
            >
              <FaChevronLeft aria-hidden="true" />
            </button>
            <strong aria-live="polite">
              {dateLabel(month, { month: "long", year: "numeric" })}
            </strong>
            <button
              type="button"
              className="wp-nav"
              aria-label="Bulan berikutnya"
              onClick={() =>
                setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))
              }
            >
              <FaChevronRight aria-hidden="true" />
            </button>
          </div>
          <div className="wp-weekdays" aria-hidden="true">
            {weeks[0].map((date) => (
              <span key={dayKey(date)}>
                {dateLabel(date, { weekday: "narrow" })}
              </span>
            ))}
          </div>
          <div className="wp-weeks">
            {weeks.map((week) => {
              const selected = dayKey(week[0]) === selectedKey;
              return (
                <div
                  key={dayKey(week[0])}
                  className={selected ? "wp-week is-selected" : "wp-week"}
                >
                  {week.map((date) => {
                    const key = dayKey(date);
                    const classes = [
                      "wp-day",
                      date.getMonth() !== month.getMonth() ? "is-outside" : "",
                      key === todayKey ? "is-today" : "",
                    ]
                      .filter(Boolean)
                      .join(" ");
                    return (
                      <button
                        key={key}
                        type="button"
                        className={classes}
                        aria-current={key === todayKey ? "date" : undefined}
                        aria-pressed={selected}
                        aria-label={dateLabel(date, {
                          weekday: "long",
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })}
                        onClick={() => {
                          onPick(date);
                          setOpen(false);
                          triggerRef.current?.focus();
                        }}
                      >
                        {date.getDate()}
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
          <button
            type="button"
            className="wp-today"
            onClick={() => {
              onPick(new Date());
              setOpen(false);
              triggerRef.current?.focus();
            }}
          >
            Lompat ke minggu ini
          </button>
        </div>
      )}
    </div>
  );
}

function useDismissLayer(
  open: boolean,
  wrapRef: React.RefObject<HTMLElement | null>,
  close: () => void,
) {
  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) close();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        close();
      }
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey, true);
    };
  }, [open, wrapRef, close]);
}

function Select<T extends string | number>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  label: string;
}) {
  const uid = useId();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const current = options.find((option) => option.value === value);
  const dismiss = useCallback(() => {
    setOpen(false);
    triggerRef.current?.focus();
  }, []);
  useDismissLayer(open, wrapRef, dismiss);
  useEffect(() => {
    if (open) listRef.current?.focus();
  }, [open]);
  const openList = () => {
    setActive(Math.max(0, options.findIndex((option) => option.value === value)));
    setOpen(true);
  };
  const choose = (index: number) => {
    onChange(options[index].value);
    dismiss();
  };
  const onListKey = (event: React.KeyboardEvent) => {
    const last = options.length - 1;
    if (event.key === "ArrowDown") setActive((i) => Math.min(i + 1, last));
    else if (event.key === "ArrowUp") setActive((i) => Math.max(i - 1, 0));
    else if (event.key === "Home") setActive(0);
    else if (event.key === "End") setActive(last);
    else if (event.key === "Enter" || event.key === " ") choose(active);
    else if (event.key === "Tab") setOpen(false);
    else return;
    if (event.key !== "Tab") event.preventDefault();
  };
  return (
    <div className="select" ref={wrapRef}>
      <button
        ref={triggerRef}
        className="field-trigger"
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={label}
        onClick={() => (open ? dismiss() : openList())}
        onKeyDown={(event) => {
          if (!open && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
            event.preventDefault();
            openList();
          }
        }}
      >
        <span>{current?.label}</span>
        <FaChevronDown aria-hidden="true" />
      </button>
      {open && (
        <div
          ref={listRef}
          className="select-list"
          role="listbox"
          tabIndex={-1}
          aria-label={label}
          aria-activedescendant={`${uid}-opt-${active}`}
          onKeyDown={onListKey}
        >
          {options.map((option, index) => (
            <div
              key={String(option.value)}
              id={`${uid}-opt-${index}`}
              role="option"
              aria-selected={option.value === value}
              className={`select-option${index === active ? " is-active" : ""}`}
              onMouseEnter={() => setActive(index)}
              onClick={() => choose(index)}
            >
              <span>{option.label}</span>
              {option.value === value && <FaCheck aria-hidden="true" />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CalendarGrid({
  value,
  onPick,
  clearable = false,
}: {
  value: string;
  onPick: (key: string | null) => void;
  clearable?: boolean;
}) {
  const selected = value ? fromKey(value) : null;
  const [month, setMonth] = useState(() => {
    const base = selected ?? new Date();
    return new Date(base.getFullYear(), base.getMonth(), 1);
  });
  const weekStarts = useContext(WeekStartContext);
  const first = mondayOf(month, weekStarts);
  const days = Array.from({ length: 42 }, (_, index) => shift(first, index));
  const rows = days[35].getMonth() !== month.getMonth() ? 5 : 6;
  return (
    <div className="calendar">
      <div className="wp-head">
        <button
          type="button"
          className="wp-nav"
          aria-label="Bulan sebelumnya"
          onClick={() =>
            setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))
          }
        >
          <FaChevronLeft aria-hidden="true" />
        </button>
        <strong aria-live="polite">
          {dateLabel(month, { month: "long", year: "numeric" })}
        </strong>
        <button
          type="button"
          className="wp-nav"
          aria-label="Bulan berikutnya"
          onClick={() =>
            setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))
          }
        >
          <FaChevronRight aria-hidden="true" />
        </button>
      </div>
      <div className="wp-weekdays" aria-hidden="true">
        {days.slice(0, 7).map((date) => (
          <span key={dayKey(date)}>{dateLabel(date, { weekday: "narrow" })}</span>
        ))}
      </div>
      <div className="dp-days">
        {days.slice(0, rows * 7).map((date) => {
          const key = dayKey(date);
          const classes = [
            "wp-day",
            date.getMonth() !== month.getMonth() ? "is-outside" : "",
            key === todayKey ? "is-today" : "",
            key === value ? "is-picked" : "",
          ]
            .filter(Boolean)
            .join(" ");
          return (
            <button
              key={key}
              type="button"
              className={classes}
              aria-pressed={key === value}
              aria-current={key === todayKey ? "date" : undefined}
              aria-label={dateLabel(date, {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
              onClick={() => onPick(key)}
            >
              {date.getDate()}
            </button>
          );
        })}
      </div>
      <div className="dp-footer">
        <button type="button" className="wp-today" onClick={() => onPick(todayKey)}>
          Hari ini
        </button>
        {clearable && (
          <button
            type="button"
            className="wp-today"
            disabled={!value}
            onClick={() => onPick(null)}
          >
            Simpan tanpa tanggal
          </button>
        )}
      </div>
    </div>
  );
}

function DatePicker({
  value,
  onChange,
  label,
  id,
  clearable = true,
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
  id?: string;
  clearable?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dismiss = useCallback(() => {
    setOpen(false);
    triggerRef.current?.focus();
  }, []);
  useDismissLayer(open, wrapRef, dismiss);
  return (
    <div className="select date-picker" ref={wrapRef}>
      <button
        ref={triggerRef}
        id={id}
        className="field-trigger"
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={label}
        onClick={() => setOpen(!open)}
      >
        <span className={value ? "" : "is-placeholder"}>
          {value
            ? dateLabel(fromKey(value), {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              })
            : "Tanpa tanggal"}
        </span>
        <FaRegCalendarAlt aria-hidden="true" />
      </button>
      {open && (
        <div className="select-list date-popover" role="dialog" aria-label={label}>
          <CalendarGrid
            key={value}
            value={value}
            clearable={clearable}
            onPick={(key) => {
              onChange(key ?? "");
              dismiss();
            }}
          />
        </div>
      )}
    </div>
  );
}

function LogoutDialog({
  onCancel,
  onConfirm,
}: {
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const { closing, close } = useModalClose(onCancel);
  const dialogRef = useRef<HTMLElement | null>(null);
  const cancelRef = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    const trigger = document.activeElement as HTMLElement | null;
    cancelRef.current?.focus();
    return () => trigger?.focus();
  }, []);
  useEffect(() => {
    const dialog = dialogRef.current;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) {
        event.preventDefault();
        close();
        return;
      }
      if (event.key !== "Tab" || !dialog) return;
      const items = [
        ...dialog.querySelectorAll<HTMLElement>("button:not([disabled])"),
      ];
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
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
  }, [close, busy]);
  return (
    <ModalFrame
      closing={closing}
      onBackdrop={() => {
        if (!busy) close();
      }}
    >
      <section
        ref={dialogRef}
        className="task-dialog logout-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="logout-title"
        aria-describedby="logout-desc"
      >
        <div className="dialog-kicker">KELUAR</div>
        <h2 id="logout-title">Keluar dari Weekflow?</h2>
        <p id="logout-desc">
          Kamu perlu masuk lagi untuk membuka planner. Tugasmu tetap tersimpan
          di akunmu.
        </p>
        <div className="dialog-actions">
          <button
            ref={cancelRef}
            className="button button-soft"
            type="button"
            onClick={close}
            disabled={busy}
          >
            Batal
          </button>
          <button
            className="button button-primary"
            type="button"
            disabled={busy}
            onClick={() => {
              setBusy(true);
              onConfirm();
            }}
          >
            {busy ? "Keluar…" : "Ya, keluar"}
          </button>
        </div>
      </section>
    </ModalFrame>
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
  onSave: (details: TaskDetails) => Promise<boolean>;
}) {
  const [title, setTitle] = useState(task?.title ?? "");
  const [date, setDate] = useState(task?.scheduledDate ?? initialDate ?? "");
  const [priority, setPriority] = useState<Priority>(task?.priority ?? "medium");
  const [description, setDescription] = useState(task?.description ?? "");
  const [note, setNote] = useState(task?.note ?? "");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const { closing, close } = useModalClose(onClose);
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
        close();
        return;
      }
      if (event.key !== "Tab" || !dialog) return;
      const items = [
        ...dialog.querySelectorAll<HTMLElement>(
          "button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled])",
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
  }, [close]);
  const submit = async (event: FormEvent) => {
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
    if (
      await onSave({
        title: clean,
        scheduledDate: date || null,
        priority,
        description: description.trim(),
        note: note.trim(),
      })
    ) {
      close();
    } else {
      setBusy(false);
      setError("Belum tersimpan. Tulisanmu masih ada, coba lagi.");
    }
  };
  return (
    <ModalFrame closing={closing} onBackdrop={close}>
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
          onClick={close}
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
          <DatePicker
            id="task-date"
            label="Tanggal (opsional)"
            value={date}
            onChange={setDate}
          />
          <span className="field-label" id="task-priority-label">
            {isEnglish() ? "Priority" : "Prioritas"}
          </span>
          <div className="priority-picker" role="radiogroup" aria-labelledby="task-priority-label">
            {(["low", "medium", "high"] as Priority[]).map((value) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={priority === value}
                className={`priority-option is-${value}${priority === value ? " is-selected" : ""}`}
                onClick={() => setPriority(value)}
              >
                <i aria-hidden="true" />
                {priorityLabel(value)}
              </button>
            ))}
          </div>
          <label htmlFor="task-description">
            {isEnglish() ? "Description (optional)" : "Deskripsi (opsional)"}
          </label>
          <textarea
            id="task-description"
            rows={3}
            maxLength={2000}
            value={description}
            placeholder={isEnglish() ? "What does done look like?" : "Seperti apa hasil akhirnya?"}
            onChange={(event) => setDescription(event.target.value)}
          />
          <label htmlFor="task-note">
            {isEnglish() ? "Note (optional)" : "Catatan (opsional)"}
          </label>
          <textarea
            id="task-note"
            rows={3}
            maxLength={5000}
            value={note}
            placeholder={isEnglish() ? "Links, thoughts, reminders…" : "Tautan, pikiran, pengingat…"}
            onChange={(event) => setNote(event.target.value)}
          />
          {error && (
            <p id="task-title-error" className="form-error" role="alert">
              {error}
            </p>
          )}
          <div className="dialog-actions">
            <button
              className="button button-soft"
              type="button"
              onClick={close}
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
    </ModalFrame>
  );
}

function AnalyticsPage({
  session,
  sessionReady,
  onSignOut,
}: {
  session: LocalSession | null;
  sessionReady: boolean;
  onSignOut: () => void;
}) {
  const router = useRouter();
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [weekStarts, setWeekStarts] = useState<number | null>(null);
  useEffect(() => {
    if (sessionReady && !session) router.replace("/login");
  }, [session, sessionReady, router]);
  useEffect(() => {
    if (!session) return;
    let value = 1;
    try {
      value =
        JSON.parse(
          localStorage.getItem(`weekflow-preferences:${session.email}`) || "{}",
        ).weekStarts ?? 1;
    } catch {}
    setWeekStarts(value);
  }, [session]);
  if (!sessionReady || !session || weekStarts === null)
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
          <button
            className="button button-soft header-logout"
            onClick={() => setConfirmLogout(true)}
          >
            Keluar
          </button>
        </div>
      </header>
      <main className="analytics-main">
        <Link className="back-link" href="/planner">
          <FaArrowLeft aria-hidden="true" /> <span>Kembali ke planner</span>
        </Link>
        <div className="settings-title analytics-title">
          <div className="eyebrow">
            <span className="eyebrow-line" />
            RINGKASAN MINGGUMU
          </div>
          <h1>
            Lihat ritme <em>mingguanmu.</em>
          </h1>
          <p>Pantau tugas yang selesai dan yang masih menunggu.</p>
        </div>
        <WeekStartContext.Provider value={weekStarts}>
          <AnalyticsBoard weekStarts={weekStarts} DateField={DatePicker} />
        </WeekStartContext.Provider>
      </main>
      <footer className="planner-footer settings-footer">
        <span>
          <span className="footer-flower" aria-hidden="true">
            <FaSun />
          </span>{" "}
          Satu minggu pada satu waktu.
        </span>
      </footer>
      {confirmLogout && (
        <LogoutDialog
          onCancel={() => setConfirmLogout(false)}
          onConfirm={onSignOut}
        />
      )}
    </div>
  );
}

function Settings({
  session,
  sessionReady,
  onSignOut,
  onProfileChanged,
}: {
  session: LocalSession | null;
  sessionReady: boolean;
  onSignOut: () => void;
  onProfileChanged: () => Promise<unknown> | void;
}) {
  const router = useRouter();
  const [theme, setTheme] = useState("light");
  const [weekStarts, setWeekStarts] = useState(1);
  const [status, setStatus] = useState("");
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [integrationsOpen, setIntegrationsOpen] = useState(false);
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
  const persist = (message: string, nextTheme = theme, nextWeek = weekStarts) => {
    if (session)
      localStorage.setItem(
        `weekflow-preferences:${session.email}`,
        JSON.stringify({ theme: nextTheme, weekStarts: nextWeek }),
      );
    setStatus(message);
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
          <button
            className="button button-soft header-logout"
            onClick={() => setConfirmLogout(true)}
          >
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
            Pengaturan sederhana,
            <br />
            <em>ritme milikmu.</em>
          </h1>
          <p>Pilih cara Weekflow menemani harimu.</p>
        </div>
        <section className="settings-card">
          <ProfileSection
            session={session}
            onChanged={onProfileChanged}
            notify={(message) => {
              setStatus(message);
              window.setTimeout(() => setStatus(""), 2400);
            }}
          />
          <div className="settings-row">
            <div>
              <h2>Tampilan</h2>
              <p>Pilih suasana layar yang terasa nyaman.</p>
            </div>
            <Select
              value={theme}
              label="Tema tampilan"
              options={[
                { value: "light", label: "Terang" },
                { value: "dark", label: "Gelap" },
                { value: "system", label: "Ikuti perangkat" },
              ]}
              onChange={(value) => {
                setTheme(value);
                persist(
                  {
                    light: "Tema diubah ke Terang.",
                    dark: "Tema diubah ke Gelap.",
                    system: "Tema mengikuti perangkat.",
                  }[value as "light" | "dark" | "system"],
                  value,
                  weekStarts,
                );
              }}
            />
          </div>
          <div className="settings-row">
            <div>
              <h2>Awal minggu</h2>
              <p>Tentukan hari pertama dalam planner.</p>
            </div>
            <Select
              value={weekStarts}
              label="Hari pertama minggu"
              options={[
                { value: 1, label: "Senin" },
                { value: 0, label: "Minggu" },
              ]}
              onChange={(value) => {
                setWeekStarts(value);
                persist(
                  value === 1
                    ? "Minggu dimulai hari Senin."
                    : "Minggu dimulai hari Minggu.",
                  theme,
                  value,
                );
              }}
            />
          </div>
          <IntegrationsRow onOpen={() => setIntegrationsOpen(true)} />
          <div className="settings-row account-setting">
            <div>
              <h2>Akun saat ini</h2>
              <p>{session.email}</p>
            </div>
            <span className="local-badge">{session.emailVerification ? "Terverifikasi" : "Belum diverifikasi"}</span>
          </div>
        </section>
        <div className="settings-note">
          <FaRegCircle aria-hidden="true" />
          <p>
            Pengaturan tampilan tersimpan di perangkat ini. Tugasmu tersimpan di akunmu.
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
      {integrationsOpen && (
        <IntegrationsDialog onClose={() => setIntegrationsOpen(false)} />
      )}
      {confirmLogout && (
        <LogoutDialog
          onCancel={() => setConfirmLogout(false)}
          onConfirm={onSignOut}
        />
      )}
      {status && (
        <div className="toast" role="status">
          <FaCheck aria-hidden="true" /> <span>{status}</span>
        </div>
      )}
    </div>
  );
}
