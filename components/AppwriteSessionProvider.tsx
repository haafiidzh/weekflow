"use client";

import { AppwriteProvider } from "@appwrite.io/react";
import type { ReactNode } from "react";

export default function AppwriteSessionProvider({
  endpoint,
  projectId,
  session,
  children,
}: {
  endpoint: string;
  projectId: string;
  session: string | null;
  children: ReactNode;
}) {
  return (
    <AppwriteProvider
      endpoint={endpoint}
      projectId={projectId}
      ssr={{ session, basePath: "/api/appwrite" }}
    >
      {children}
    </AppwriteProvider>
  );
}
