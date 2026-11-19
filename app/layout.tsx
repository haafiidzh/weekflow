import type { Metadata } from "next";
import type { ReactNode } from "react";
import AppwriteSessionProvider from "@/components/AppwriteSessionProvider";
import { getAppwriteSession } from "@/lib/appwrite/auth";
import { getPublicAppwriteConfig } from "@/lib/appwrite/config";
import "./globals.css";

export const metadata: Metadata = {
  title: "Weekflow | Ruang untuk minggu yang lebih ringan",
  description:
    "Planner mingguan sederhana untuk merapikan hal yang perlu dilakukan.",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  const { endpoint, projectId } = getPublicAppwriteConfig();
  const session = await getAppwriteSession();
  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{if(localStorage.getItem("weekflow-language")==="en"){var d=document.documentElement;d.lang="en";d.setAttribute("data-lang","en");setTimeout(function(){d.setAttribute("data-lang-ready","")},2000)}}catch(e){}`,
          }}
        />
      </head>
      <body>
        <AppwriteSessionProvider
          endpoint={endpoint}
          projectId={projectId}
          session={session}
        >
          {children}
        </AppwriteSessionProvider>
      </body>
    </html>
  );
}
