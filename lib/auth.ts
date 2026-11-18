export type LocalSession = {
  id: string;
  email: string;
  name: string;
  /** Whether Appwrite has confirmed that the account owns this email address. */
  emailVerification: boolean;
};
import { seedPreviewTasks } from "@/lib/data";

const SESSION_KEY = "weekflow-preview-session";
const ACCOUNTS_KEY = "weekflow-preview-accounts";

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function readAccounts(): string[] {
  try {
    return JSON.parse(localStorage.getItem(ACCOUNTS_KEY) || "[]") as string[];
  } catch {
    return [];
  }
}

export function getSession(): LocalSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed: { email: string; name?: string; emailVerification?: boolean } = JSON.parse(raw);
    return {
      id: crypto.randomUUID(),
      email: parsed.email,
      name: parsed.name || parsed.email.split("@")[0],
      emailVerification: parsed.emailVerification ?? false,
    };
  } catch {
    return null;
  }
}

export function signUp(email: string, password: string): LocalSession {
  const cleanEmail = normalizeEmail(email);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail))
    throw new Error("Masukkan alamat email yang valid.");
  if (password.length < 8)
    throw new Error("Kata sandi perlu berisi setidaknya 8 karakter.");
  const accounts = readAccounts();
  if (accounts.includes(cleanEmail))
    throw new Error(
      "Email ini sudah terdaftar di pratinjau browser ini. Coba masuk.",
    );
  accounts.push(cleanEmail);
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
  seedPreviewTasks(cleanEmail);
  const session: LocalSession = {
    id: crypto.randomUUID(),
    email: cleanEmail,
    name: cleanEmail.split("@")[0],
    emailVerification: false,
  };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  seedPreviewTasks(cleanEmail);
  return session;
}

export function signIn(email: string, password: string): LocalSession {
  const cleanEmail = normalizeEmail(email);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail))
    throw new Error("Masukkan alamat email yang valid.");
  if (password.length < 8)
    throw new Error("Kata sandi perlu berisi setidaknya 8 karakter.");
  if (!readAccounts().includes(cleanEmail))
    throw new Error(
      "Akun pratinjau ini belum ditemukan. Buat akun terlebih dahulu di browser ini.",
    );
  const session: LocalSession = {
    id: crypto.randomUUID(),
    email: cleanEmail,
    name: cleanEmail.split("@")[0],
    emailVerification: false,
  };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return session;
}

export function signOut() {
  localStorage.removeItem(SESSION_KEY);
}
