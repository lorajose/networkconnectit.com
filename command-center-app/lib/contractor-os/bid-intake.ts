export const BID_DOCUMENT_TYPES = [
  "DRAWING",
  "SPECIFICATION",
  "SCOPE",
  "ADDENDUM",
  "VENDOR_QUOTE",
  "SUBCONTRACTOR_QUOTE",
  "OTHER",
] as const;

export type BidDocumentType = (typeof BID_DOCUMENT_TYPES)[number];

export type BidIntakeMetadata = {
  title: string;
  bidDueAt?: string | null;
  revision?: string | null;
  notes?: string | null;
};

export type BidDocumentMetadata = {
  fileName: string;
  documentType: BidDocumentType;
  revision?: string | null;
  sourceKey: string;
  sourceMimeType?: string | null;
  sourceSizeBytes?: number | null;
};

const MAX_TITLE_LENGTH = 191;
const MAX_FILE_NAME_LENGTH = 255;
const MAX_REVISION_LENGTH = 64;
const MAX_SOURCE_KEY_LENGTH = 512;

function cleanOptional(value?: string | null) {
  const cleaned = value?.trim();
  return cleaned ? cleaned : null;
}

export function normalizeBidIntakeMetadata(input: BidIntakeMetadata): BidIntakeMetadata {
  const title = input.title.trim();
  if (!title) throw new Error("Bid title is required");
  if (title.length > MAX_TITLE_LENGTH) throw new Error("Bid title is too long");

  const revision = cleanOptional(input.revision);
  if (revision && revision.length > MAX_REVISION_LENGTH) throw new Error("Bid revision is too long");

  if (input.bidDueAt) {
    const due = new Date(input.bidDueAt);
    if (Number.isNaN(due.getTime())) throw new Error("Bid due date is invalid");
  }

  return {
    title,
    bidDueAt: cleanOptional(input.bidDueAt),
    revision,
    notes: cleanOptional(input.notes),
  };
}

export function normalizeBidDocumentMetadata(input: BidDocumentMetadata): BidDocumentMetadata {
  const fileName = input.fileName.trim();
  const sourceKey = input.sourceKey.trim();

  if (!fileName) throw new Error("Document file name is required");
  if (fileName.length > MAX_FILE_NAME_LENGTH) throw new Error("Document file name is too long");
  if (!BID_DOCUMENT_TYPES.includes(input.documentType)) throw new Error("Document type is invalid");
  if (!sourceKey) throw new Error("Document storage key is required");
  if (sourceKey.length > MAX_SOURCE_KEY_LENGTH) throw new Error("Document storage key is too long");
  if (input.sourceSizeBytes != null && (!Number.isInteger(input.sourceSizeBytes) || input.sourceSizeBytes < 0)) {
    throw new Error("Document size is invalid");
  }

  const revision = cleanOptional(input.revision);
  if (revision && revision.length > MAX_REVISION_LENGTH) throw new Error("Document revision is too long");

  return {
    fileName,
    documentType: input.documentType,
    revision,
    sourceKey,
    sourceMimeType: cleanOptional(input.sourceMimeType),
    sourceSizeBytes: input.sourceSizeBytes ?? null,
  };
}
