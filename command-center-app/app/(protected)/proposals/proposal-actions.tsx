"use client";

import { useMemo, useState } from "react";

const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

type ProposalActionsProps = {
  proposalNumber: string;
  customerName: string;
  customerTotal: number;
  validUntilIso: string;
};

export function ProposalActions({ proposalNumber, customerName, customerTotal, validUntilIso }: ProposalActionsProps) {
  const [signerName, setSignerName] = useState("");
  const [signerEmail, setSignerEmail] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [receipt, setReceipt] = useState<string | null>(null);

  const acceptanceText = useMemo(
    () =>
      `I authorize ${proposalNumber} for ${currency.format(customerTotal)} and confirm that I have reviewed the scope, assumptions, exclusions, payment terms and warranty.`,
    [proposalNumber, customerTotal],
  );

  function exportPdf() {
    window.print();
  }

  function approveProposal() {
    if (!signerName.trim() || !accepted) return;
    const approvedAt = new Date().toISOString();
    const reference = `${proposalNumber}:${approvedAt}`;
    setReceipt(reference);
  }

  return (
    <div className="space-y-4 print:hidden">
      <button
        type="button"
        onClick={exportPdf}
        className="w-full rounded-xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
      >
        Export / Save as PDF
      </button>

      <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-950">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="font-semibold">Customer approval</h3>
            <p className="mt-1 text-emerald-800">
              Capture the signer and acceptance before the proposal expires on {new Date(validUntilIso).toLocaleDateString("en-US")}.
            </p>
          </div>
          <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-emerald-700">{customerName}</span>
        </div>

        <div className="mt-4 grid gap-3">
          <label className="grid gap-1.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-emerald-800">Signer name</span>
            <input
              value={signerName}
              onChange={(event) => setSignerName(event.target.value)}
              className="rounded-lg border border-emerald-200 bg-white px-3 py-2 text-slate-950 outline-none focus:border-emerald-500"
              placeholder="Full name"
            />
          </label>
          <label className="grid gap-1.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-emerald-800">Signer email</span>
            <input
              type="email"
              value={signerEmail}
              onChange={(event) => setSignerEmail(event.target.value)}
              className="rounded-lg border border-emerald-200 bg-white px-3 py-2 text-slate-950 outline-none focus:border-emerald-500"
              placeholder="name@company.com"
            />
          </label>
          <label className="flex items-start gap-3 rounded-lg bg-white p-3">
            <input
              type="checkbox"
              checked={accepted}
              onChange={(event) => setAccepted(event.target.checked)}
              className="mt-1"
            />
            <span className="leading-6 text-slate-700">{acceptanceText}</span>
          </label>
          <button
            type="button"
            onClick={approveProposal}
            disabled={!signerName.trim() || !accepted || Boolean(receipt)}
            className="rounded-xl bg-emerald-700 px-4 py-3 font-semibold text-white transition enabled:hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {receipt ? "Proposal approved" : "Approve proposal"}
          </button>
        </div>

        {receipt ? (
          <div className="mt-4 rounded-xl border border-emerald-200 bg-white p-4">
            <div className="font-semibold">Approval captured</div>
            <div className="mt-1 text-xs text-slate-600">Signer: {signerName}{signerEmail ? ` · ${signerEmail}` : ""}</div>
            <div className="mt-1 break-all text-xs text-slate-500">Reference: {receipt}</div>
          </div>
        ) : null}
      </section>
    </div>
  );
}
