import type { Metadata } from "next";
import type { ReactNode } from "react";

import { AppShell } from "@/components/app-shell";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    noarchive: true,
    nosnippet: true
  }
};

export default async function ProtectedLayout({
  children
}: {
  children: ReactNode;
}) {
  const user = await requireUser();

  return (
    <AppShell
      user={{
        name: user.name,
        email: user.email,
        role: user.role,
        organizationId: user.organizationId
      }}
    >
      {children}
    </AppShell>
  );
}
