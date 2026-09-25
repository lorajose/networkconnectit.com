const MAX_RECEIPT_BYTES = 10 * 1024 * 1024;
const ALLOWED_RECEIPT_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

function segment(value: string, label: string) {
  const normalized = value.trim();
  if (!normalized || !/^[A-Za-z0-9_-]+$/.test(normalized)) {
    throw new Error(`${label} is invalid.`);
  }
  return normalized;
}

export function validateReceiptUpload(input: {
  organizationId: string;
  expenseId: string;
  fileName: string;
  contentType: string;
  size: number;
}) {
  const organizationId = segment(input.organizationId, "Organization");
  const expenseId = segment(input.expenseId, "Expense");
  const fileName = input.fileName.trim();
  if (!fileName || fileName.length > 255 || fileName.includes("/") || fileName.includes("\\") || fileName.includes("..")) {
    throw new Error("Receipt file name is invalid.");
  }
  if (!ALLOWED_RECEIPT_TYPES.has(input.contentType)) {
    throw new Error("Receipt file type is not allowed.");
  }
  if (!Number.isSafeInteger(input.size) || input.size <= 0 || input.size > MAX_RECEIPT_BYTES) {
    throw new Error("Receipt file size is not allowed.");
  }
  return { organizationId, expenseId, fileName, contentType: input.contentType, size: input.size };
}

export function receiptStorageKey(input: {
  organizationId: string;
  expenseId: string;
  objectId: string;
  fileName: string;
}) {
  const organizationId = segment(input.organizationId, "Organization");
  const expenseId = segment(input.expenseId, "Expense");
  const objectId = segment(input.objectId, "Object");
  const fileName = validateReceiptUpload({ organizationId, expenseId, fileName: input.fileName, contentType: "application/pdf", size: 1 }).fileName;
  return `organizations/${organizationId}/expenses/${expenseId}/${objectId}--${encodeURIComponent(input.fileName)}`;
}

export { MAX_RECEIPT_BYTES, ALLOWED_RECEIPT_TYPES };
