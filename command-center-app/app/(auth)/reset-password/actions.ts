"use server";

import { redirect } from "next/navigation";

import { withAppBasePath } from "@/lib/app-paths";
import { completePasswordReset } from "@/lib/security/account-recovery";

function resetPath(token: string, error: string) {
  const params = new URLSearchParams({ token, error });
  return withAppBasePath(`/reset-password?${params.toString()}`);
}

export async function completePasswordResetAction(formData: FormData) {
  const tokenValue = formData.get("token");
  const passwordValue = formData.get("password");
  const confirmValue = formData.get("confirmPassword");

  const token = typeof tokenValue === "string" ? tokenValue : "";
  const password = typeof passwordValue === "string" ? passwordValue : "";
  const confirmPassword = typeof confirmValue === "string" ? confirmValue : "";

  if (!token) redirect(withAppBasePath("/reset-password?error=invalid"));
  if (password !== confirmPassword) redirect(resetPath(token, "mismatch"));

  try {
    await completePasswordReset(token, password);
  } catch {
    redirect(resetPath(token, "invalid"));
  }

  redirect(withAppBasePath("/login?reset=success"));
}
