function safeErrorName(error: unknown) {
  return error instanceof Error ? error.name : "UnknownError";
}

export function emitRuntimeError(input: {
  operation: string;
  error: unknown;
  organizationId?: string | null;
  requestId?: string | null;
}) {
  // Do not serialize Error.message/stack here: upstream/provider messages can contain sensitive values.
  console.error(
    JSON.stringify({
      type: "runtime_error",
      operation: input.operation,
      errorName: safeErrorName(input.error),
      organizationId: input.organizationId ?? null,
      requestId: input.requestId ?? null,
      occurredAt: new Date().toISOString()
    })
  );
}
