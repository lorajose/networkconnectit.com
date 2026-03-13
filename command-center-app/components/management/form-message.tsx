import type { ManagementFormState } from "@/lib/management/form-state";

export function FormMessage({ state }: { state: ManagementFormState }) {
  if (state.status !== "error" || !state.message) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-rose-500/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
      {state.message}
    </div>
  );
}
