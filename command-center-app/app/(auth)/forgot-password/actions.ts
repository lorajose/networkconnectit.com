"use server";

import { redirect } from "next/navigation";

import { withAppBasePath } from "@/lib/app-paths";
import { deliverPasswordResetEmail } from "@/lib/security/account-email-delivery";
import { issuePasswordResetTokenForDelivery } from "@/lib/security/account-recovery";

export async function requestPasswordResetAction(formData: FormData) {
  const emailValue = formData.get("email");
  const email = typeof emailValue === "string" ? emailValue.trim().toLowerCase() : "";

  if (email) {
    const token = await issuePasswordResetTokenForDelivery(email);
    if (token) {
      try {
        await deliverPasswordResetEmail({ email, token });
      } catch {
        console.error(JSON.stringify({ type: "account_security", event: "PASSWORD_RESET_DELIVERY_FAILED" }));
      }
    }
  }

  // Never reveal whether an account exists or whether delivery was attempted.
  redirect(withAppBasePath("/forgot-password?sent=1"));
}
