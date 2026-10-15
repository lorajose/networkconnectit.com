import type { Metadata } from "next";
import type { ReactNode } from "react";

import { AppShell } from "@/components/app-shell";
import { requireUser } from "@/lib/auth";
import { getSubscriptionExperienceSummaryForActor } from "@/lib/contractor-os/subscription-access-repository";

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
  const subscription = user.organizationId
    ? await getSubscriptionExperienceSummaryForActor({
        role: user.role,
        organizationId: user.organizationId
      })
    : null;

  return (
    <AppShell
      user={{
        name: user.name,
        email: user.email,
        role: user.role,
        organizationId: user.organizationId
      }}
      subscription={subscription}
    >
      {children}
    </AppShell>
  );
}
