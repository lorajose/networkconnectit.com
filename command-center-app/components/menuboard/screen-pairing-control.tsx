"use client";

import { useFormState } from "react-dom";

import { Button } from "@/components/ui/button";

type PairingState = {
  status: "idle" | "error" | "success";
  message?: string;
  code?: string;
  expiresAt?: string;
};

const initialState: PairingState = {
  status: "idle"
};

type PairingAction = (
  state: PairingState,
  payload: FormData
) => Promise<PairingState>;

export function ScreenPairingControl({
  generateAction,
  revokeAction,
  canRevoke
}: {
  generateAction: PairingAction;
  revokeAction: PairingAction;
  canRevoke: boolean;
}) {
  const [pairingState, generateFormAction] = useFormState(
    generateAction,
    initialState
  );
  const [revokeState, revokeFormAction] = useFormState(
    revokeAction,
    initialState
  );

  return (
    <div className="space-y-3">
      {pairingState.code ? (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-emerald-200">
            One-time pairing code
          </p>
          <p className="mt-2 font-mono text-3xl font-semibold tracking-[0.3em] text-foreground">
            {pairingState.code}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            {pairingState.message}
            {pairingState.expiresAt
              ? ` Expires ${new Date(pairingState.expiresAt).toLocaleTimeString()}.`
              : ""}
          </p>
        </div>
      ) : pairingState.message ? (
        <p
          className={
            pairingState.status === "error"
              ? "text-sm text-rose-300"
              : "text-sm text-muted-foreground"
          }
        >
          {pairingState.message}
        </p>
      ) : null}

      {revokeState.message ? (
        <p
          className={
            revokeState.status === "error"
              ? "text-sm text-rose-300"
              : "text-sm text-muted-foreground"
          }
        >
          {revokeState.message}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <form action={generateFormAction}>
          <Button type="submit" size="sm" variant="outline">
            Generate pairing code
          </Button>
        </form>

        {canRevoke ? (
          <form action={revokeFormAction}>
            <Button type="submit" size="sm" variant="ghost">
              Revoke player
            </Button>
          </form>
        ) : null}
      </div>
    </div>
  );
}
