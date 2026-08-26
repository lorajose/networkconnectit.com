import Link from "next/link";
import { notFound } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { requireRoles } from "@/lib/auth";
import { BID_DOCUMENT_TYPES } from "@/lib/contractor-os/bid-intake";
import { BID_STATUSES, getBidWorkspace } from "@/lib/contractor-os/bid-repository";
import { routeAccess } from "@/lib/rbac";
import { snapshotBidEvidenceAction, updateBidAction, uploadBidDocumentAction } from "../actions";

type Props = { params: { bidId: string }; searchParams?: { organizationId?: string } };

function localDateTime(value: Date | null) {
  if (!value) return "";
  const offset = value.getTimezoneOffset();
  return new Date(value.getTime() - offset * 60_000).toISOString().slice(0, 16);
}

export default async function BidDetailPage({ params, searchParams }: Props) {
  const user = await requireRoles(routeAccess.bids);
  const organizationId = user.organizationId ?? searchParams?.organizationId ?? "";
  if (!organizationId) notFound();

  const bid = await getBidWorkspace(
    { role: user.role, organizationId: user.organizationId },
    params.bidId,
    organizationId,
  );
  if (!bid) notFound();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href={`/bids?organizationId=${encodeURIComponent(organizationId)}`} className="text-sm text-primary hover:underline">← Back to bids</Link>
          <p className="mt-3 text-sm font-medium uppercase tracking-[0.2em] text-primary">{bid.bidNumber}</p>
          <h1 className="text-3xl font-semibold tracking-tight">{bid.title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">Edit commercial context, upload private bid documents, and freeze the exact evidence package used for estimating.</p>
        </div>
        <div className="rounded-2xl border px-4 py-3 text-sm">
          <p className="font-medium">{bid.status.replaceAll("_", " ")}</p>
          <p className="text-muted-foreground">{bid.documents.length} source document{bid.documents.length === 1 ? "" : "s"}</p>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Bid details</CardTitle><CardDescription>Update scope context without changing the tenant boundary.</CardDescription></CardHeader>
          <CardContent>
            <form action={updateBidAction} className="space-y-4">
              <input type="hidden" name="organizationId" value={organizationId} />
              <input type="hidden" name="bidId" value={bid.id} />
              <div className="space-y-2"><Label htmlFor="title">Title</Label><Input id="title" name="title" defaultValue={bid.title} required /></div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2"><Label htmlFor="status">Status</Label><Select id="status" name="status" defaultValue={bid.status}>{BID_STATUSES.map((status) => <option key={status} value={status}>{status.replaceAll("_", " ")}</option>)}</Select></div>
                <div className="space-y-2"><Label htmlFor="revision">Bid revision</Label><Input id="revision" name="revision" defaultValue={bid.revision ?? ""} /></div>
              </div>
              <div className="space-y-2"><Label htmlFor="bidDueAt">Bid due</Label><Input id="bidDueAt" name="bidDueAt" type="datetime-local" defaultValue={localDateTime(bid.bidDueAt)} /></div>
              <div className="space-y-2"><Label htmlFor="projectInstallationId">Project ID</Label><Input id="projectInstallationId" name="projectInstallationId" defaultValue={bid.projectInstallationId ?? ""} /></div>
              <div className="space-y-2"><Label htmlFor="estimateId">Estimate ID</Label><Input id="estimateId" name="estimateId" defaultValue={bid.estimateId ?? ""} /></div>
              <div className="space-y-2"><Label htmlFor="notes">Notes</Label><Textarea id="notes" name="notes" defaultValue={bid.notes ?? ""} /></div>
              <Button type="submit">Save bid changes</Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Upload source document</CardTitle>
            <CardDescription>Files are written to configured private storage outside the public web root; only opaque storage keys are persisted in MySQL.</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={uploadBidDocumentAction} className="space-y-4">
              <input type="hidden" name="organizationId" value={organizationId} />
              <input type="hidden" name="bidId" value={bid.id} />
              <div className="space-y-2"><Label htmlFor="file">Document</Label><Input id="file" name="file" type="file" accept=".pdf,.png,.jpg,.jpeg,.webp,.txt,.csv,.zip,.xls,.xlsx,.doc,.docx" required /></div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2"><Label htmlFor="documentType">Document type</Label><Select id="documentType" name="documentType">{BID_DOCUMENT_TYPES.map((type) => <option key={type} value={type}>{type.replaceAll("_", " ")}</option>)}</Select></div>
                <div className="space-y-2"><Label htmlFor="documentRevision">Revision</Label><Input id="documentRevision" name="revision" placeholder="Rev A" /></div>
              </div>
              <p className="text-xs text-muted-foreground">Default upload limit: 50 MB per file. Configure BID_PRIVATE_STORAGE_ROOT to a persistent absolute server path.</p>
              <Button type="submit">Upload private document</Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Estimate evidence handoff</CardTitle>
          <CardDescription>Create an immutable snapshot of this bid revision and all currently registered source documents before continuing pricing in NCI-010.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center justify-between gap-4">
          <div className="text-sm text-muted-foreground">
            {bid.estimateId ? <>Linked estimate: <span className="font-mono text-foreground">{bid.estimateId}</span></> : "Link an Estimate ID above before creating a snapshot."}
          </div>
          <form action={snapshotBidEvidenceAction}>
            <input type="hidden" name="organizationId" value={organizationId} />
            <input type="hidden" name="bidId" value={bid.id} />
            <Button type="submit" disabled={!bid.estimateId}>Snapshot evidence → Estimate</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Source evidence history</CardTitle><CardDescription>Each uploaded revision remains an independent row so estimate snapshots can preserve exactly what was used for pricing.</CardDescription></CardHeader>
        <CardContent className="space-y-3">
          {bid.documents.length === 0 ? <p className="text-sm text-muted-foreground">No documents uploaded yet.</p> : bid.documents.map((document) => (
            <div key={document.id} className="flex flex-wrap items-start justify-between gap-3 rounded-2xl border p-4">
              <div><p className="font-medium">{document.fileName}</p><p className="text-sm text-muted-foreground">{document.documentType.replaceAll("_", " ")}{document.revision ? ` · ${document.revision}` : ""}</p><p className="mt-1 break-all text-xs text-muted-foreground">Private key: {document.sourceKey}</p></div>
              <div className="text-right text-xs text-muted-foreground"><p>{document.sourceMimeType ?? "Unknown MIME"}</p><p>{document.sourceSizeBytes?.toString() ?? "Unknown size"} bytes</p></div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
