import Link from "next/link";

import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireRoles } from "@/lib/auth";
import { getClientSafeInvoice } from "@/lib/company-operations/repository";
import { routeAccess } from "@/lib/rbac";

type Props = { params: { invoiceId: string }; searchParams?: Record<string, string | string[] | undefined> };
const money = (value: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
const date = (value: Date | null) => value ? new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(value) : "—";

export default async function InvoicePage({ params, searchParams = {} }: Props) {
  const user = await requireRoles(routeAccess.companyOperations);
  const requestedOrganizationId = typeof searchParams.organizationId === "string" ? searchParams.organizationId : undefined;
  const invoice = await getClientSafeInvoice(
    { id: user.id, role: user.role, organizationId: user.organizationId },
    { organizationId: user.organizationId || requestedOrganizationId, invoiceId: params.invoiceId }
  );

  return <div className="mx-auto max-w-4xl space-y-6">
    <div className="print:hidden">
      <PageHeader eyebrow="Client invoice" title={invoice.invoiceNumber} description="Client-safe invoice view. Use your browser print dialog to print or save as PDF." breadcrumbs={[{ label: "Company Operations", href: "/operations" }, { label: invoice.invoiceNumber }]} />
    </div>

    <Card>
      <CardHeader className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div><CardTitle className="text-2xl">NetworkConnectIT LLC</CardTitle><p className="text-sm text-muted-foreground">Invoice {invoice.invoiceNumber}</p></div>
          <div className="text-right text-sm"><p className="font-semibold">{invoice.status}</p><p>Issued {date(invoice.issueDate)}</p><p>Due {date(invoice.dueDate)}</p></div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2"><div><p className="text-xs uppercase text-muted-foreground">Bill to</p><p className="font-medium">{invoice.customerName}</p></div>{invoice.projectName ? <div><p className="text-xs uppercase text-muted-foreground">Project</p><p className="font-medium">{invoice.projectCode ? `${invoice.projectCode} · ` : ""}{invoice.projectName}</p></div> : null}</div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left"><th className="py-2">Description</th><th className="py-2">Type</th><th className="py-2 text-right">Qty</th><th className="py-2 text-right">Unit price</th><th className="py-2 text-right">Amount</th></tr></thead><tbody>{invoice.lines.map(line => <tr key={line.id} className="border-b"><td className="py-3">{line.description}</td><td className="py-3">{line.lineType}</td><td className="py-3 text-right">{Number(line.quantity)}</td><td className="py-3 text-right">{money(Number(line.unitPrice))}</td><td className="py-3 text-right">{money(Number(line.amount))}</td></tr>)}</tbody></table></div>
        <div className="ml-auto max-w-sm space-y-2 text-sm"><div className="flex justify-between"><span>Subtotal</span><span>{money(Number(invoice.subtotal))}</span></div><div className="flex justify-between"><span>Tax</span><span>{money(Number(invoice.taxAmount))}</span></div><div className="flex justify-between"><span>Discount</span><span>-{money(Number(invoice.discountAmount))}</span></div><div className="flex justify-between border-t pt-2 font-semibold"><span>Total</span><span>{money(Number(invoice.totalAmount))}</span></div><div className="flex justify-between"><span>Paid</span><span>{money(Number(invoice.paidAmount))}</span></div><div className="flex justify-between text-lg font-semibold"><span>Balance due</span><span>{money(invoice.balanceDue)}</span></div></div>
        {invoice.payments.length ? <div><h3 className="mb-2 font-semibold">Payments</h3><div className="space-y-1 text-sm">{invoice.payments.map(payment => <div key={payment.id} className="flex flex-wrap justify-between gap-2 border-b py-2"><span>{date(payment.paidAt)}{payment.method ? ` · ${payment.method}` : ""}{payment.reference ? ` · ${payment.reference}` : ""}</span><span>{money(Number(payment.amount))}</span></div>)}</div></div> : null}
      </CardContent>
    </Card>
    <div className="print:hidden"><Link href="/operations" className="text-sm underline">Back to Company Operations</Link></div>
  </div>;
}
