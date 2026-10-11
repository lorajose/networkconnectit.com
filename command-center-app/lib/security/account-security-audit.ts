export type AccountSecurityEvent =
  | "PASSWORD_RESET_COMPLETED"
  | "EMAIL_VERIFIED"
  | "SESSIONS_INVALIDATED"
  | "ACCOUNT_DISABLED"
  | "ACCOUNT_REACTIVATED";

export function emitAccountSecurityEvent(input: {
  event: AccountSecurityEvent;
  userId: string;
  actorUserId?: string | null;
}) {
  // Security logs intentionally exclude email addresses, passwords, hashes and tokens.
  console.info(JSON.stringify({
    type: "account_security",
    event: input.event,
    userId: input.userId,
    actorUserId: input.actorUserId ?? null,
    occurredAt: new Date().toISOString()
  }));
}
