import type { Metadata } from "next";
import type { ReactNode } from "react";

import { AuthShell } from "@/components/marketing/auth-shell";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    noarchive: true,
    nosnippet: true
  }
};

export default function AuthLayout({
  children
}: Readonly<{
  children: ReactNode;
}>) {
  return <AuthShell>{children}</AuthShell>;
}
