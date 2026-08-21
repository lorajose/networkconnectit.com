import { requireUser } from "@/lib/auth";
import { EstimateWorkspace } from "./workspace";

export default async function EstimatesPage() {
  await requireUser();

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium uppercase tracking-wider text-sky-600">Contractor OS</p>
        <h1 className="text-3xl font-bold tracking-tight">Estimate & Profit Workspace</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-600">
          Build a field-ready low-voltage estimate, see the real job cost, protect margin, and turn the result into the commercial foundation for a proposal.
        </p>
      </div>
      <EstimateWorkspace />
    </div>
  );
}
