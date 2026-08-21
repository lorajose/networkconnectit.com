import type { EstimateTotals } from "./cost-engine";

export type ProposalBranding = {
  companyName: string;
  phone?: string;
  email?: string;
  website?: string;
  license?: string;
};

export type ProposalCustomer = {
  companyName: string;
  contactName?: string;
  email?: string;
  phone?: string;
  siteAddress?: string;
};

export type ProposalLine = {
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  amount: number;
};

export type ProposalInput = {
  proposalNumber: string;
  title: string;
  branding: ProposalBranding;
  customer: ProposalCustomer;
  scopeSummary: string;
  lines: ProposalLine[];
  totals: EstimateTotals;
  exclusions?: string[];
  assumptions?: string[];
  paymentTerms?: string;
  warranty?: string;
  validForDays?: number;
  createdAt?: Date;
};

export type ProposalDocument = ProposalInput & {
  createdAtIso: string;
  validUntilIso: string;
  customerSubtotal: number;
  customerTax: number;
  customerTotal: number;
};

export function buildProposalDocument(input: ProposalInput): ProposalDocument {
  if (!input.proposalNumber.trim()) throw new Error("proposalNumber is required");
  if (!input.title.trim()) throw new Error("title is required");
  if (!input.branding.companyName.trim()) throw new Error("branding.companyName is required");
  if (!input.customer.companyName.trim()) throw new Error("customer.companyName is required");
  if (!input.scopeSummary.trim()) throw new Error("scopeSummary is required");
  if (!input.lines.length) throw new Error("at least one proposal line is required");

  const createdAt = input.createdAt ?? new Date();
  const validForDays = Math.max(1, Math.floor(input.validForDays ?? 30));
  const validUntil = new Date(createdAt);
  validUntil.setUTCDate(validUntil.getUTCDate() + validForDays);

  return {
    ...input,
    createdAt,
    validForDays,
    createdAtIso: createdAt.toISOString(),
    validUntilIso: validUntil.toISOString(),
    customerSubtotal: input.totals.sellSubtotal - input.totals.discountAmount,
    customerTax: input.totals.taxAmount,
    customerTotal: input.totals.total,
  };
}

export function proposalSnapshot(document: ProposalDocument) {
  return JSON.stringify({
    proposalNumber: document.proposalNumber,
    title: document.title,
    branding: document.branding,
    customer: document.customer,
    scopeSummary: document.scopeSummary,
    lines: document.lines,
    exclusions: document.exclusions ?? [],
    assumptions: document.assumptions ?? [],
    paymentTerms: document.paymentTerms ?? "",
    warranty: document.warranty ?? "",
    createdAtIso: document.createdAtIso,
    validUntilIso: document.validUntilIso,
    customerSubtotal: document.customerSubtotal,
    customerTax: document.customerTax,
    customerTotal: document.customerTotal,
  });
}
