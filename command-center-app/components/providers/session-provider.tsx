"use client";

import type { ReactNode } from "react";
import { SessionProvider } from "next-auth/react";

import { nextAuthBasePath } from "@/lib/app-paths";

export function AuthSessionProvider({ children }: { children: ReactNode }) {
  return <SessionProvider basePath={nextAuthBasePath}>{children}</SessionProvider>;
}
