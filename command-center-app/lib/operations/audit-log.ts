export type AuditResult = "SUCCESS" | "DENIED" | "FAILED";

const SENSITIVE_KEYS = /password|secret|token|authorization|cookie|hash|document|content/i;

function sanitizeMetadata(metadata: Record<string, unknown> | undefined) {
  if (!metadata) return undefined;

  return Object.fromEntries(
    Object.entries(metadata)
      .filter(([key]) => !SENSITIVE_KEYS.test(key))
      .map(([key, value]) => {
        if (value === null || typeof value === "boolean" || typeof value === "number") {
          return [key, value];
        }
        return [key, String(value).slice(0, 200)];
      })
  );
}

export function emitAuditEvent(input: {
  action: string;
  result: AuditResult;
  actorUserId?: string | null;
  organizationId?: string | null;
  targetType?: string | null;
  targetId?: string | null;
  metadata?: Record<string, unknown>;
}) {
  console.info(
    JSON.stringify({
      type: "audit",
      action: input.action,
      result: input.result,
      actorUserId: input.actorUserId ?? null,
      organizationId: input.organizationId ?? null,
      targetType: input.targetType ?? null,
      targetId: input.targetId ?? null,
      metadata: sanitizeMetadata(input.metadata),
      occurredAt: new Date().toISOString()
    })
  );
}
