import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Weekflow | Ruang untuk minggu yang lebih ringan",
  description:
    "Planner mingguan sederhana untuk merapikan hal yang perlu dilakukan.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
