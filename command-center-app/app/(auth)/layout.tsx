import type { ReactNode } from "react";

import { AuthShell } from "@/components/marketing/auth-shell";

export default function AuthLayout({
  children
}: Readonly<{
  children: ReactNode;
}>) {
  return <AuthShell>{children}</AuthShell>;
}
