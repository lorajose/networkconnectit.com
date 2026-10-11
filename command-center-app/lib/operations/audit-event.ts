export type AuditResult = "SUCCESS" | "DENIED" | "FAILED";

export type OperationalAuditEvent = {
  action: string;
  actorUserId?: string | null;
  organizationId?: string | null;
  targetType: string;
  targetId?: string | null;
  result: AuditResult;
  metadata?: Record<string, string | number | boolean | null>;
};

const FORBIDDEN_METADATA_KEYS = /(password|secret|token|hash|authorization|cookie|document|content)/i;

function safeMetadata(metadata?: OperationalAuditEvent["metadata"]) {
  if (!metadata) return undefined;

  return Object.fromEntries(
    Object.entries(metadata).filter(([key]) => !FORBIDDEN_METADATA_KEYS.test(key))
  );
}

export function emitOperationalAuditEvent(event: OperationalAuditEvent) {
  console.info(JSON.stringify({
    type: "operational_audit",
    action: event.action,
    actorUserId: event.actorUserId ?? null,
    organizationId: event.organizationId ?? null,
    targetType: event.targetType,
    targetId: event.targetId ?? null,
    result: event.result,
    metadata: safeMetadata(event.metadata),
    occurredAt: new Date().toISOString()
  }));
}
