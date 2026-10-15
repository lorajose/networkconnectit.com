function requiredDeliveryConfig() {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.AUTH_EMAIL_FROM?.trim();
  const publicBaseUrl = process.env.AUTH_PUBLIC_BASE_URL?.trim();

  if (!apiKey || !from || !publicBaseUrl) return null;

  let baseUrl: URL;
  try {
    baseUrl = new URL(publicBaseUrl.endsWith("/") ? publicBaseUrl : `${publicBaseUrl}/`);
  } catch {
    return null;
  }

  if (process.env.NODE_ENV === "production" && baseUrl.protocol !== "https:") {
    return null;
  }

  return { apiKey, from, baseUrl };
}

export async function deliverPasswordResetEmail(input: { email: string; token: string }) {
  const config = requiredDeliveryConfig();
  if (!config) return false;

  const resetUrl = new URL("reset-password", config.baseUrl);
  resetUrl.searchParams.set("token", input.token);

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: config.from,
      to: [input.email.trim().toLowerCase()],
      subject: "Reset your NetworkConnectIT Command Center password",
      html: `<p>A password reset was requested for your NetworkConnectIT Command Center account.</p><p><a href="${resetUrl.toString().replaceAll("&", "&amp;")}">Reset password</a></p><p>This link expires in 15 minutes. If you did not request this, you can ignore this email.</p>`
    })
  });

  return response.ok;
}
