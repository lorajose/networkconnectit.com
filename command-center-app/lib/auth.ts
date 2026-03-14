import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { authOptions } from "@/lib/auth-options";
import type { AppRole } from "@/lib/rbac";
import { hasRequiredRole } from "@/lib/rbac";

export async function getCurrentSession() {
  return getServerSession(authOptions);
}

export async function getCurrentUser() {
  const session = await getCurrentSession();
  return session?.user ?? null;
}

export async function requireUser() {
  const user = await getCurrentUser();

  if (!user?.id || !user.email || !user.role) {
    redirect("/login");
  }

  return user;
}

export async function requireRoles(allowedRoles: readonly AppRole[]) {
  const user = await requireUser();

  if (!hasRequiredRole(user.role, allowedRoles)) {
    redirect("/dashboard");
  }

  return user;
}
